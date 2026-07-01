import type { Project } from './types'
import { PRINT_KEYS, type FramingKey } from '@/components/edit/in-use-options'

export interface InferredParams {
  device: string
  surface?: string
  includeHuman: boolean
  framing: FramingKey
  environment: string
  /** Reason we picked these params, for logging / QA. */
  reason: string
}

export interface EligibilityResult {
  eligible: boolean
  reason: string
}

/** Small deterministic string hash for stable per-project variant picks. */
function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = (h * 16777619) >>> 0
  }
  return h
}

const NON_SCREEN_KEYWORDS = /(installation|mural|sculpture|activation|projection\s*mapping|physical\s+object|pin|badge|wearable|jewelry|garment|apparel|architecture)/i
const VIDEO_ONLY_KEYWORDS = /^(video|animation|motion\s*graphic|film)$/i

/** Determine whether a project is suitable for an in-use image. We skip
 *  projects that don't have a digital/print artifact to place on a device. */
export function checkEligibility(project: Project, mediaFilenames: string[]): EligibilityResult {
  const nonInuseSources = mediaFilenames.filter(f => !/_inuse[_.]/i.test(f) && /\.(webp|png|jpe?g|gif)$/i.test(f))
  if (nonInuseSources.length === 0) {
    return { eligible: false, reason: 'no eligible source image (no non-inuse image files in storage)' }
  }
  const output = (project.output || '').toLowerCase()
  if (VIDEO_ONLY_KEYWORDS.test(output.trim())) {
    return { eligible: false, reason: `output type "${project.output}" is video-only, no static UI to composite` }
  }
  // If both the project category AND all descriptions imply physical-only,
  // skip. But if the project produced any digital/print artifact alongside,
  // include it.
  if (NON_SCREEN_KEYWORDS.test(output) && !/(dashboard|report|book|poster|magazine|app|web|interactive|scrollytelling|platform|guideline)/i.test(output)) {
    return { eligible: false, reason: `output "${project.output}" reads as physical-only (no screen or print artifact)` }
  }
  return { eligible: true, reason: 'has source image and screen-compatible output category' }
}

/** Pick the best available source image filename for the reference. */
export function pickSourceImage(project: Project, mediaFilenames: string[]): string | null {
  const eligible = mediaFilenames.filter(f => !/_inuse[_.]/i.test(f) && /\.(webp|png|jpe?g|gif)$/i.test(f))
  if (eligible.length === 0) return null
  const hero = project.heroImage
  if (hero && !/_inuse[_.]/i.test(hero) && eligible.includes(hero)) return hero
  // Fall back to media_order[0] (if in media_order) or first eligible file.
  const ordered = project.mediaOrder?.find(f => eligible.includes(f))
  return ordered || eligible[0]
}

/** Infer generation params from project metadata. Deterministic — same inputs
 *  yield same output. */
export function inferInUseParams(project: Project): InferredParams {
  const output = (project.output || '').toLowerCase()
  const section = (project.section || '').toLowerCase()
  const domains = (project.domains || []).map(d => d.toLowerCase()).join(' ')
  const services = (project.services || []).map(s => s.toLowerCase()).join(' ')
  const combined = `${output} ${services} ${domains}`

  // ----- Device selection ----------------------------------------------------
  let device: string
  let deviceReason: string

  if (/(book|report|publication|magazine|editorial\s+print|annual\s+report)/i.test(combined)) {
    device = 'book'
    deviceReason = 'output/services suggest bound print (book/report/magazine)'
  } else if (/(poster|leaflet|brochure|flyer)/i.test(combined)) {
    device = 'poster'
    deviceReason = 'output suggests loose print (poster/leaflet)'
  } else if (/(wall|installation|exhibit|gallery|museum|mural|large.?screen|projection|kiosk|touchscreen|activation)/i.test(combined)) {
    device = /kiosk|touchscreen/i.test(combined) ? 'kiosk' : 'wall_screen'
    deviceReason = 'output/domain suggests architectural or exhibition display'
  } else if (/(mobile\s*app|native\s*app|ios\s*app|android\s*app|smartphone|phone|iphone)/i.test(combined)) {
    device = 'smartphone'
    deviceReason = 'output suggests mobile app'
  } else if (/(tablet|ipad)/i.test(combined)) {
    device = 'tablet'
    deviceReason = 'output suggests tablet form factor'
  } else if (/(dashboard|analytics|monitor|control\s+room|command\s+center|enterprise|bi\b|business\s+intelligence)/i.test(combined)) {
    device = 'desktop_computer'
    deviceReason = 'output suggests enterprise / monitor context'
  } else {
    // Fallback for web / interactive / general
    device = 'laptop'
    deviceReason = 'default (web / interactive / general digital)'
  }

  // ----- Surface (print only) -----------------------------------------------
  let surface: string | undefined
  if (PRINT_KEYS.has(device)) {
    if (device === 'poster' || device === 'billboard') surface = 'wall_mounted'
    else if (device === 'magazine' || device === 'leaflet') surface = 'held_in_hands'
    else surface = 'desk_or_table' // books default to on a surface
  }

  // ----- Human + framing -----------------------------------------------------
  const includeHuman = true
  const framing: FramingKey = 'hands_only'

  // ----- Environment --------------------------------------------------------
  // Deterministic per-project variation: pick 1 of N phrasings per category
  // using a stable hash of project.id. Yields visual variety across projects
  // in the same category without losing per-category identity.
  const idx = hash(project.id)

  const pick = (variants: string[]) => variants[idx % variants.length]

  let environment: string
  let envReason: string

  if (/(museum|gallery|exhibit|installation|biennale|salone|triennale)/i.test(`${combined} ${(project.client || '').toLowerCase()}`)) {
    environment = pick([
      'a raw concrete gallery bench in a museum interior, with soft directional daylight from a high clerestory window and polished concrete floor',
      'a dim exhibition hall with dark grey walls, a single warm spotlight overhead, and worn oak flooring underneath',
      'a museum lobby with terrazzo flooring, a low-slung marble bench, and cool north-facing skylight, matte white walls',
      'a modern art gallery with white plaster walls, a black polished concrete floor, and a narrow slot window casting a hard diagonal band of light',
    ])
    envReason = 'museum / gallery context'
  } else if (/(finance|banking|bank|payments?|insurance|accounting|wealth)/i.test(combined)) {
    environment = pick([
      'a corner office with floor-to-ceiling glass, brushed steel desk, cool morning light, minimal furniture',
      'an executive meeting room with dark stained oak table, matte black chairs, cool grey wool carpet, floor-to-ceiling windows overlooking a city grid',
      'a bank trading floor observation deck at dawn: raw concrete floor, distant multi-screen walls out of focus, and low warm ambient lighting from recessed strips',
      'a private banking lobby with polished travertine floor, a single black leather bench, and a tall narrow window pouring geometric light onto matte plaster walls',
    ])
    envReason = 'finance / corporate luxury'
  } else if (/(health|pharma|life\s*sciences?|medical|hospital|clinical)/i.test(combined)) {
    environment = pick([
      'a research institution interior with bright neutral daylight, glass partitions, matte concrete floor, minimal instruments visible',
      'a clinical strategy room with white epoxy floors, a stainless steel table, and cool fluorescent-adjacent lighting from a diffused ceiling panel',
      'a modern pharma lab lobby with warm oak paneling on one wall, polished concrete floors, and a wall of glass overlooking an internal courtyard',
      'a hospital administration wing with matte white walls, a pale beech bench, and soft indirect daylight from a clerestory',
    ])
    envReason = 'health / life sciences'
  } else if (/(policy|government|nonprofit|foundation|academic|university|research|think\s*tank)/i.test(combined)) {
    environment = pick([
      'a policy institute lobby with concrete walls, a raw wooden bench, and a tall north-facing window casting geometric daylight patterns on the floor',
      'a university seminar room with a long oak table, matte black metal chairs, wide window with venetian blinds slicing the sunlight',
      'a nonprofit foundation atrium with a poured concrete floor, exposed steel structure overhead, and a single warm lamp on a side table',
      'a research reading room with dark green leather club chairs, walnut floor, and a large casement window with rain-streaked glass in soft focus',
      'a policy think tank library with tall bookshelves, a wide reading table, an Anglepoise lamp, and cool late-afternoon light coming through a tall window',
    ])
    envReason = 'policy / academia'
  } else if (/(retail|fashion|beauty|apparel|design\s*fair|luxury)/i.test(combined)) {
    environment = pick([
      'a fashion brand creative office with terrazzo floor, minimal design furniture, one large window, cool desaturated palette',
      'a luxury boutique back office with plush charcoal carpet, brushed brass fixtures, and a wide picture window looking onto a European boulevard',
      'a beauty brand studio with matte white walls, a pale marble surface, and a tall floor lamp casting warm indirect light',
      'a design studio loft with exposed brick, polished cement floor, a single vintage swan chair, and diffused daylight from a north-facing skylight',
    ])
    envReason = 'retail / fashion'
  } else if (/(sports|olympic|broadcast|media|newsroom|journalism)/i.test(combined)) {
    environment = pick([
      'a media control room with dark concrete walls, ambient monitor glow, and a single spotlight overhead',
      'a broadcast studio green room with black acoustic paneling, warm tungsten sconces, and a matte black leather bench',
      'a modern newsroom late at night, dimmed overhead lighting, motion-blurred colleagues moving in the deep background',
      'a sports data operations center with matte grey walls, a single monitor bank out of focus, and cool blue ambient light',
    ])
    envReason = 'media / broadcasting'
  } else if (/(energy|industrial|manufacturing|construction|infrastructure)/i.test(combined)) {
    environment = pick([
      'an industrial operations room with polished concrete floor, exposed steel structure, cool overhead lighting, no clutter',
      'an engineering war room with a large plotter table, exposed HVAC ducting on the ceiling, and a wall of frosted glass diffusing daylight',
      'a construction firm headquarters lobby with poured concrete, a single reclaimed timber bench, and a wide industrial window',
      'a utility company office wing with matte grey walls, a raw wooden bench, and afternoon light striping the polished floor',
    ])
    envReason = 'energy / industrial'
  } else if (device === 'wall_screen' || device === 'wall_projection') {
    environment = pick([
      'a dim brutalist gallery interior with raw concrete walls, spotlighting on the screen, motion-blurred visitors passing through',
      'a corporate lobby with dark stone floor, a single spotlit screen mounted on a matte black wall, one silhouetted figure walking past',
      'a modernist civic hall with poured concrete walls, exposed steel beams overhead, and a large mounted display as the only bright element',
      'an exhibition hall with matte grey walls, ambient overhead lighting, and a single figure standing before the screen at an angle',
    ])
    envReason = 'wall-mounted screen defaults to institutional interior'
  } else if (device === 'book' || device === 'poster' || device === 'magazine' || device === 'leaflet' || device === 'billboard') {
    environment = pick([
      'a concrete gallery bench with raw wall behind, soft directional daylight from a high window, minimal shadow on the paper',
      'a wide oak reading table in a library, one Anglepoise lamp casting a warm pool of light, dark background out of focus',
      'a designer studio worktop of matte white lacquer with a pale linen runner, an architect ruler set to one side, cool overhead daylight',
      'a museum publishing office with a walnut desk, brass gooseneck lamp, and a tall window pouring cool north light',
    ])
    envReason = 'print defaults to library / studio / gallery'
  } else {
    environment = pick([
      'a terrazzo floor in a minimal architectural interior with a pool of directional window light and no domestic softness',
      'a modernist loft with a wide-plank oak floor, matte white walls, and a tall industrial window casting a bright shaft of morning light',
      'a design studio interior with polished cement floor, a single black wire chair, and a large north-facing window',
      'a coworking building lobby with brushed concrete floor, exposed ceiling structure, and one bright pool of light in an otherwise dim space',
    ])
    envReason = 'default architectural interior'
  }

  return {
    device,
    surface,
    includeHuman,
    framing,
    environment,
    reason: `device: ${deviceReason}. environment: ${envReason}.`,
  }
}
