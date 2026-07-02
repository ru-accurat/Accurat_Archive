import type { Project } from './types'
import { PRINT_KEYS, type FramingKey } from '@/components/edit/in-use-options'

/** Deterministic FNV-1a hash for stable per-project pool picks. */
function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = (h * 16777619) >>> 0
  }
  return h
}

// ────────────────────────────────────────────────────────────────────────────
// Framing recipes (weighted, deterministic pick)
// ────────────────────────────────────────────────────────────────────────────

export interface FramingRecipe {
  key: string
  weight: number
  phrasing: string
}

const FRAMING_RECIPES: FramingRecipe[] = [
  { key: 'screen_close_up', weight: 30, phrasing: 'Tight close-up on the device screen, the screen fills 70-80% of the frame. Only a fragment of a hand or a shoulder is visible at the edge for scale. The screen content is the entire subject.' },
  { key: 'hands_mid',       weight: 25, phrasing: 'Hands and forearms holding or resting on the device, screen fully readable, no face visible. Framed from just above the device, showing the interaction naturally.' },
  { key: 'over_shoulder',   weight: 20, phrasing: 'Over-the-shoulder view from behind the person, showing the back of their head, one shoulder, and the device screen at a natural reading angle. Face not visible.' },
  { key: 'side_profile',    weight: 15, phrasing: 'Side or three-quarter view, showing the person\'s silhouette against the environment with the device held or placed at their working distance. Face partial, in shadow, or cropped.' },
  { key: 'wide_contextual', weight: 10, phrasing: 'A wider environmental shot, the device visible in the space at natural scale, the person present but proportionally smaller, showing how the setting frames the device.' },
]

function pickFraming(seed: number): FramingRecipe {
  const total = FRAMING_RECIPES.reduce((a, r) => a + r.weight, 0)
  let n = seed % total
  for (const r of FRAMING_RECIPES) {
    if (n < r.weight) return r
    n -= r.weight
  }
  return FRAMING_RECIPES[0]
}

// ────────────────────────────────────────────────────────────────────────────
// Photo-style vector — modern digital only, no vintage or heavy grain
// ────────────────────────────────────────────────────────────────────────────

const FOCAL_LENGTHS = [
  'shot on a 24mm wide-angle, giving the environment breathing room around the device',
  'shot on a 35mm lens, natural documentary field of view',
  'shot on a 50mm lens, neutral perspective, minimal distortion',
  'shot on an 85mm lens, tight compression, background gently defocused',
]

const COLOR_GRADES = [
  'cool desaturated color grade, neutral shadows, muted mid-tones',
  'warm-neutral color grade with clean skin tones and a subtle amber lift in highlights',
  'high-contrast neutral grade with deep blacks and cleanly separated mid-tones',
  'muted pastel palette, low saturation across the board, gentle color separation',
  'clean natural rendering, faithful color reproduction, no visible grade',
]

const LIGHT_QUALITIES = [
  'hard directional light with well-defined shadows and crisp edges',
  'soft diffused window light, gentle falloff, minimal contrast',
  'a single overhead or side spotlight against ambient shadow, high dynamic range',
  'overcast even lighting, soft shadows, uniform exposure across the scene',
  'mixed practical lighting from lamps and window daylight, warm and cool sources coexisting',
]

const TIME_OF_DAY = [
  'clear cool morning light',
  'flat midday indoor daylight, no warm cast',
  'afternoon cool light with slight blue tint',
  'soft indoor evening light from practical fixtures, never warm sunset',
]

const CAMERA_HINTS = [
  'a modern full-frame digital camera, contemporary editorial rendering, minimal noise',
  'a modern medium-format digital body, clean detail rendering, no grain',
  'a modern digital cinema camera, precise skin tones, natural color science',
  'a professional mirrorless system, sharp resolution, contemporary look',
]

export interface PhotoStyle {
  focal: string
  grade: string
  light: string
  time: string
  camera: string
}

function pickPhotoStyle(seed: number): PhotoStyle {
  return {
    focal: FOCAL_LENGTHS[(seed >>> 3) % FOCAL_LENGTHS.length],
    grade: COLOR_GRADES[(seed >>> 5) % COLOR_GRADES.length],
    light: LIGHT_QUALITIES[(seed >>> 7) % LIGHT_QUALITIES.length],
    time: TIME_OF_DAY[(seed >>> 11) % TIME_OF_DAY.length],
    camera: CAMERA_HINTS[(seed >>> 13) % CAMERA_HINTS.length],
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Cast archetypes — organized by domain, each with age / style / ethnicity variety
// ────────────────────────────────────────────────────────────────────────────

const CAST_BY_DOMAIN: Record<string, string[]> = {
  healthcare: [
    'a woman in her mid-30s, black hair pulled into a low bun, wearing a white lab coat over a plain shirt, olive skin',
    'a man in his 50s, cropped grey beard, navy scrubs, brown skin, calm posture',
    'a woman in her late 20s, Black, tight curls, stethoscope around her neck, light blue clinical uniform',
    'a man in his early 40s, East Asian, silver-framed glasses, white coat over a grey polo, thoughtful expression',
    'a nonbinary person in their 30s, shaved head, tortoiseshell glasses, a subdued patterned scrub top, fair skin with freckles',
  ],
  museum: [
    'a woman in her mid-40s, wearing a linen jumpsuit and canvas sneakers, silver rimmed glasses, warm brown skin',
    'a man in his late 20s, dark curly hair, black turtleneck, minimal silver earring, olive Mediterranean skin',
    'a woman in her 60s, close-cropped white hair, tailored charcoal blazer, pale skin with laugh lines',
    'a South Asian man in his mid-30s, dark beard, denim overshirt over a plain t-shirt, tan leather bag on shoulder',
    'a young Black woman in her early 20s, box braids, cream cardigan, wide-legged jeans, art-student aesthetic',
  ],
  finance: [
    'a woman in her early 40s, dark hair in a low ponytail, tailored navy suit, subtle gold jewelry, Southeast Asian',
    'a man in his mid-50s, salt-and-pepper hair, charcoal wool suit, no tie, white shirt open at collar, white',
    'a woman in her 30s, hijab in muted forest green, black wool coat, laptop bag slung over shoulder',
    'a Black man in his 40s, close-cropped hair, warm brown blazer, plain white shirt, quiet confidence',
    'a person in their late 20s, sharp bob haircut, cream suit, minimalist gold ring, East Asian',
  ],
  retail: [
    'a woman in her late 20s, long dark waves, oversized cream sweater, delicate gold chain, Latina',
    'a man in his 30s, buzz cut, black t-shirt, dark jeans, small tattoo visible on forearm, white',
    'a woman in her 40s, natural coily hair, mustard yellow linen dress, warm brown skin, casual posture',
    'a nonbinary person in their 20s, faded blue mullet, pale patterned button-up, tortoiseshell glasses, Middle Eastern',
    'a woman in her 50s, silver bob, denim shirt with rolled sleeves, tan skin, artist-forward aesthetic',
  ],
  tech: [
    'a woman in her mid-20s, dark straight hair, black hoodie, tortoiseshell frames, East Asian, focused',
    'a man in his 40s, shaved head, plain grey t-shirt, tattooed forearms, brown skin',
    'a woman in her 30s, natural afro, colorful patterned scarf around neck, black cardigan, Black',
    'a nonbinary developer in their late 20s, chin-length teal-tipped hair, oversized flannel over a band tee, white',
    'a South Asian man in his late 30s, trimmed beard, muted olive henley, wireframe glasses',
  ],
  media: [
    'a Black woman in her 30s, braided top-knot, black jumpsuit, silver hoop earrings, minimal makeup',
    'a man in his mid-40s, dark hair with grey at temples, faded band t-shirt under an unstructured blazer, white',
    'a woman in her late 20s, red-tinted glasses, cropped platinum hair, black oversized shirt, Mediterranean',
    'a Southeast Asian nonbinary person in their 30s, black tank top, fine gold chain, sleeve tattoos, journalistic posture',
    'a man in his 50s, salt-and-pepper hair, worn corduroy jacket over a plain shirt, camera strap visible',
  ],
  academia: [
    'a woman in her 60s, silver braid, tortoiseshell glasses, wool cardigan with elbow patches, pale skin',
    'a man in his 30s, dark curly hair, brown corduroy jacket, plain shirt, Middle Eastern, holding a book',
    'a woman in her 40s, natural short afro, wire-rim glasses, cream turtleneck, Black, thoughtful posture',
    'a young researcher in their 20s, undercut haircut, plain black t-shirt, faded tote bag on shoulder, South Asian',
    'a professor in his 50s, East Asian, salt-and-pepper hair, dark grey blazer over plain white shirt, calm demeanor',
  ],
  culture: [
    'a woman in her 30s, close-cropped bleached hair, geometric silver earrings, black minimalist dress, olive skin',
    'a man in his mid-40s, shaved head, dark grey knit jumper, small silver ring, warm brown skin',
    'a curator in her 50s, silver hair in a chic bob, tortoiseshell frames, tailored linen suit, pale skin',
    'a young art critic in his 20s, dark curly hair, patterned button-up, worn leather satchel, Latino',
    'a woman in her 40s, natural gray-streaked hair, denim jumpsuit, colorful woven scarf, Indigenous features',
  ],
  sports: [
    'a woman in her late 20s, high ponytail, technical athletic top, athletic build, Black',
    'a man in his 30s, buzz cut, moisture-wicking shirt, tan skin, focused, holding a water bottle',
    'a coach in his 50s, salt-and-pepper beard, weathered polo, white, weathered hands',
    'a young athlete in their teens or early 20s, wearing team colors, Southeast Asian, casual stance',
    'a woman in her 40s, athletic build, close-cropped natural hair, running gear, Latina',
  ],
  policy: [
    'a woman in her 50s, silver bob, tailored wool coat, understated pearl earrings, pale skin, quiet authority',
    'a man in his 40s, cropped beard, navy suit without a tie, warm brown skin, holding a notepad',
    'a policy analyst in her 30s, hijab in muted grey, dark blazer over a plain shell top, calm expression',
    'a Black senior civil servant in his 50s, closely trimmed grey hair, charcoal suit, quiet gravitas',
    'a young researcher in their late 20s, East Asian, tortoiseshell glasses, cardigan over a shirt, thoughtful',
  ],
  hospitality: [
    'a woman in her 30s, dark hair in a low chignon, crisp white shirt, tan skin, hospitality-professional posture',
    'a man in his 40s, close-shaved beard, dark waiter apron over plain shirt, brown skin',
    'a chef in his 50s, salt-and-pepper hair tied back, white chef jacket, weathered hands, Mediterranean',
    'a barista in her 20s, natural afro, black apron, Black, wearing a small silver nose ring',
    'a hotel concierge in his 30s, tailored dark uniform, olive skin, Middle Eastern',
  ],
  energy: [
    'an engineer in his 40s, hi-vis vest over plain shirt, hard hat tucked under arm, brown skin, South Asian',
    'a woman in her 30s, safety glasses pushed up on her head, technical jumpsuit, blonde hair in braid, white',
    'a technician in his 50s, weathered hands, dark work uniform, worn cap in hand, Latino',
    'a plant operator in her 40s, hair covered by cap, no-nonsense expression, warm brown skin',
    'a young engineer in their late 20s, tortoiseshell glasses, plain technical shirt, East Asian, thoughtful',
  ],
  home: [
    'a woman in her 30s, sitting cross-legged, oversized knit sweater, natural coily hair pulled back, Black',
    'a father in his 40s, plain t-shirt and jeans, dark hair, olive skin, casual weekend posture',
    'a teenager in their late teens, hoodie and joggers, mixed-race features, wearing headphones',
    'a grandmother in her 70s, silver hair in a bun, wool cardigan, warm brown skin, glasses on the tip of her nose',
    'a young adult in their 20s, undercut haircut, oversized band t-shirt, cross-legged on a rug, white',
  ],
  fallback: [
    'a woman in her 30s, plain natural styling, no distinctive brand markers, mid-tone brown skin',
    'a man in his 40s, close-shaved beard, muted casual clothing, olive skin',
    'a nonbinary person in their late 20s, short natural hair, plain neutral-toned clothing, Black',
    'a person in their 50s, silver hair, tailored but understated clothing, East Asian',
    'a young adult in their early 20s, casual layered clothing, warm brown skin, South Asian',
  ],
}

function pickCastArchetype(project: Project, seed: number): string {
  const combined = `${project.description || ''} ${project.output || ''} ${project.services?.join(' ') || ''} ${project.domains?.join(' ') || ''} ${project.client || ''}`.toLowerCase()

  const domains: Array<[keyof typeof CAST_BY_DOMAIN, RegExp]> = [
    ['healthcare', /(health|pharma|life\s*sciences?|medical|hospital|clinical|patient|clinician|nurse|drug|pharmac|epidemi|abbvie|iqvia|iqvia|iavi|glaxo|novartis|pfizer|bristol|bayer|roche)/i],
    ['museum',     /(museum|gallery|exhibit|installation|biennale|salone|triennale|artwork|artist|curator|moma|louvre|guggenheim|tate|whitney|getty|met|prado|prada foundation)/i],
    ['finance',    /(finance|banking|\bbank\b|payments?|insurance|accounting|wealth|hedge|invest|nexi|adyen|unicredit|deutsche|jpmorgan|allianz|generali|schroders)/i],
    ['retail',     /(retail|fashion|beauty|apparel|luxury|cosmetics|shopping|store|shopper|sephora|lvmh|valentino|prada|adidas|nike|starbucks|coffee|f&b|hospitality)/i],
    ['tech',       /(saas|platform|app|api|developer|engineer|startup|analytics|dashboard|software|data\s*engineering|ci\/cd|devops|cloud)/i],
    ['media',      /(media|newsroom|journalism|broadcast|editorial|publisher|magazine|guardian|nyt|new\s*york\s*times|washington\s*post|reuters|associated\s*press|bbc)/i],
    ['academia',   /(academic|university|college|scholar|research(?!\s*center)|professor|phd|student|columbia|harvard|stanford|mit|oxford|cambridge)/i],
    ['culture',    /(archive|literature|philosophy|history|heritage|opera|theater|architecture|design(?!\s*system))/i],
    ['sports',     /(sport|olympic|athlete|football|basketball|tennis|ferrari|formula|team|championship)/i],
    ['policy',     /(policy|government|ministry|nonprofit|foundation|think\s*tank|advocacy|civil\s*society|un\b|undp|world\s*bank|world\s*health|wef|world\s*economic|climate|sustainability)/i],
    ['hospitality',/(restaurant|hotel|chef|kitchen|cafe|café|coffee\s*bar|bistro)/i],
    ['energy',     /(energy|oil|gas|renewables?|utility|utilities|grid|solar|wind|geothermal|saipem|eni|enel|tenaris|hydrocarbon)/i],
    ['home',       /(consumer|family|household|home|domestic|personal|wellness|leisure|entertainment|kids)/i],
  ]

  for (const [key, rx] of domains) {
    if (rx.test(combined)) {
      const pool = CAST_BY_DOMAIN[key]
      return pool[seed % pool.length]
    }
  }
  return CAST_BY_DOMAIN.fallback[seed % CAST_BY_DOMAIN.fallback.length]
}

// ────────────────────────────────────────────────────────────────────────────
// Environment taxonomy — many more scenes, description-first parsing
// ────────────────────────────────────────────────────────────────────────────

const ENV_POOLS: Record<string, string[]> = {
  museum_gallery: [
    'a raw concrete gallery bench in a museum interior, soft directional daylight from a high clerestory window and polished concrete floor',
    'a dim exhibition hall with dark grey walls, a single warm spotlight overhead, and worn oak flooring underneath',
    'a modern art gallery with white plaster walls, a black polished concrete floor, and a narrow slot window casting a hard diagonal band of light',
    'a museum lobby with terrazzo flooring, a low-slung marble bench, cool north-facing skylight, matte white walls',
  ],
  research_lab: [
    'a wet lab bench with matte white surfaces, a rack of test tubes gently out of focus in the background, cool overhead LED panels',
    'a life-sciences lab corridor with glass partitions, stainless steel fume hoods reflected on polished floor, bright neutral daylight',
    'a computational biology workstation, dual monitors dark in background, a small pipette rack on the desk, cool ambient light',
    'a physics lab with a granite optical table, cabled instruments faded behind, single spotlight over the working area',
  ],
  clinical: [
    'a clinical strategy room with white epoxy floors, a stainless steel table, cool fluorescent-adjacent lighting from a diffused ceiling panel',
    'a hospital administration wing with matte white walls, a pale beech bench, soft indirect daylight from a clerestory',
    'a modern pharma lab lobby with warm oak paneling on one wall, polished concrete floors, a wall of glass overlooking an internal courtyard',
    'a modern clinic waiting area with muted sage walls, a light beech bench, filtered daylight through vertical louvers',
  ],
  finance_office: [
    'a corner office with floor-to-ceiling glass, brushed steel desk, cool morning light, minimal furniture',
    'an executive meeting room with dark stained oak table, matte black chairs, cool grey wool carpet, floor-to-ceiling windows overlooking a city grid',
    'a private banking lobby with polished travertine floor, a single black leather bench, a tall narrow window pouring geometric light onto matte plaster walls',
    'a bank trading floor observation deck at dawn: raw concrete floor, distant multi-screen walls out of focus, low warm ambient lighting from recessed strips',
  ],
  retail_store: [
    'a modern boutique interior with brushed brass fixtures, pale marble floor, minimal clothing on rails, one wide window with soft daylight',
    'a design object shop with pale oak shelves, matte white walls, a single Nordic bench, natural cool light',
    'a luxury store back-of-house with plush charcoal carpet, brushed brass fixtures, mirror walls, soft directional lighting',
    'a concept store showroom with polished cement floor, minimal furniture in the middle of the room, cool overhead track lighting',
  ],
  library: [
    'a policy think tank library with tall bookshelves, a wide reading table, an Anglepoise lamp, cool late-afternoon light coming through a tall window',
    'a research reading room with dark green leather club chairs, walnut floor, a large casement window with rain-streaked glass in soft focus',
    'a modern university library, minimal steel shelving, a wide wooden reading desk, cool skylight above',
    'a private study with floor-to-ceiling bookshelves, a burgundy leather chair, a brass reading lamp, warm indirect lighting',
  ],
  classroom: [
    'a university seminar room with a long oak table, matte black metal chairs, wide window with venetian blinds slicing the sunlight',
    'a modern classroom with pale birch desks, matte white walls, a wide north-facing window, a whiteboard partially visible',
    'a lecture-hall stage with dark tiered seating gently out of focus, a matte black lectern, ambient spotlighting',
  ],
  design_studio: [
    'a fashion brand creative office with terrazzo floor, minimal design furniture, one large window, cool desaturated palette',
    'a design studio loft with exposed brick, polished cement floor, a single vintage swan chair, diffused daylight from a north-facing skylight',
    'a graphic design studio with a large wooden worktop, a swing-arm lamp, samples pinned to a corkboard in soft focus',
    'a product design workshop with a wide steel table, pale grey walls, and a wall of clean industrial windows',
  ],
  workshop_maker: [
    'a woodworking workshop with a wide oak workbench, hand tools in the background, sawdust catching afternoon light',
    'a metal fabrication studio with a matte grey concrete floor, a heavy steel table, ambient shop lighting',
    'a bike-repair workshop with a stand in the background, worn concrete floor, warm practical lighting',
    'a ceramics studio with pale wood shelves of drying vessels, a wide clay-covered worktable, diffused daylight from a skylight',
  ],
  factory_industrial: [
    'an industrial operations room with polished concrete floor, exposed steel structure, cool overhead lighting, no clutter',
    'an engineering war room with a large plotter table, exposed HVAC ducting on the ceiling, a wall of frosted glass diffusing daylight',
    'a modern factory floor observation deck, matte grey walls, one large window looking onto the shop floor out of focus',
    'a utility company office wing with matte grey walls, a raw wooden bench, afternoon light striping the polished floor',
  ],
  home_interior: [
    'a minimalist apartment living room with pale oak floors, a linen sofa, a low walnut coffee table, soft directional light from a tall window',
    'a modern kitchen counter of matte white lacquer, a woven placemat, natural morning daylight through a wide window',
    'a home office with a walnut desk, an Eames chair, a shelf of books in soft focus, cool afternoon light',
    'a reading nook with a linen armchair, pale wool throw, a small side table with a ceramic mug, warm indoor lighting from a single lamp',
    'a bedroom with white linen bedding, dark wood floor, a mid-century side table, soft window light from the left',
  ],
  cafe_bar: [
    'a specialty coffee bar with a dark walnut counter, brass espresso machine slightly out of focus, warm practical lighting from pendants',
    'a modern café with terrazzo floor, marble table tops, minimal chairs, natural morning light through the storefront window',
    'a wine bar with dark oak paneling, low warm lighting, a single marble table in the foreground',
  ],
  street_urban: [
    'a European street bench at midday, concrete plaza in the background, a metal handrail, soft overcast lighting',
    'a public transit platform with concrete tiles, a stainless steel bench, ambient station lighting, motion-blurred commuters in the deep background',
    'an outdoor city park bench in early spring, dappled shade from a tree, cool ambient light, minimal foliage',
    'a modern airport lounge waiting area with a walnut bench, floor-to-ceiling window looking out onto a rain-wet tarmac, cool ambient light',
  ],
  broadcast_studio: [
    'a broadcast studio green room with black acoustic paneling, warm tungsten sconces, a matte black leather bench',
    'a modern newsroom late at night, dimmed overhead lighting, motion-blurred colleagues moving in the deep background',
    'a sports data operations center with matte grey walls, a single monitor bank out of focus, cool blue ambient light',
    'a media control room with dark concrete walls, ambient monitor glow, a single spotlight overhead',
  ],
  wall_display: [
    'a dim brutalist gallery interior with raw concrete walls, spotlighting on the screen, motion-blurred visitors passing through',
    'a corporate lobby with dark stone floor, a single spotlit screen mounted on a matte black wall, one silhouetted figure walking past',
    'a modernist civic hall with poured concrete walls, exposed steel beams overhead, a large mounted display as the only bright element',
    'a public exhibition hall with matte grey walls, ambient overhead lighting, a single figure standing before the screen at an angle',
  ],
  print_context: [
    'a wide oak reading table, one Anglepoise lamp casting a warm pool of light, dark background out of focus',
    'a designer studio worktop of matte white lacquer with a pale linen runner, an architect ruler set to one side, cool overhead daylight',
    'a museum publishing office with a walnut desk, brass gooseneck lamp, tall window pouring cool north light',
    'a concrete gallery bench with raw wall behind, soft directional daylight from a high window, minimal shadow on the paper',
  ],
  policy_lobby: [
    'a policy institute lobby with concrete walls, a raw wooden bench, a tall north-facing window casting geometric daylight patterns on the floor',
    'a nonprofit foundation atrium with a poured concrete floor, exposed steel structure overhead, a single warm lamp on a side table',
    'a civic building interior with matte stone walls, wide oak floor, cool ambient light from tall vertical windows',
  ],
  fallback_architectural: [
    'a terrazzo floor in a minimal architectural interior with a pool of directional window light and no domestic softness',
    'a modernist loft with a wide-plank oak floor, matte white walls, a tall industrial window casting a bright shaft of morning light',
    'a design studio interior with polished cement floor, a single black wire chair, and a large north-facing window',
    'a coworking building lobby with brushed concrete floor, exposed ceiling structure, one bright pool of light in an otherwise dim space',
  ],
  editorial_publication: [
    'an editorial desk in a magazine office with a wide oak worktop, page proofs pinned to a corkboard in soft focus, a swing-arm lamp casting warm working light',
    'a boardroom reading table with a walnut top, one crisp printout laid flat, tall windows behind casting cool afternoon light',
    'a modern marketing team room with matte grey walls, a pale wood conference table, a single potted plant and a stack of unbound printed pages, natural daylight from tall windows',
    'a design studio review wall behind a wide oak table, printed proofs pinned in a grid, warm practical lighting overhead',
  ],
}

function pickEnvironment(project: Project, device: string, seed: number): { text: string; category: string } {
  const desc = (project.description || '').toLowerCase()
  const combined = `${desc} ${(project.output || '').toLowerCase()} ${(project.services || []).join(' ').toLowerCase()} ${(project.domains || []).join(' ').toLowerCase()} ${(project.client || '').toLowerCase()}`

  // Description-first: strong signals from the description win.
  // Regexes use \b word boundaries where naive substrings cause false
  // positives (e.g. "hospital" in "hospitality", "energy" in "visual energy",
  // "medic" in "medically"). Ordering: retail/finance/museum before generic
  // energy/lab/policy so common cases catch first.
  const patterns: Array<[keyof typeof ENV_POOLS, RegExp]> = [
    ['workshop_maker',      /(workshop|maker\s*space|artisan|\bcraft(s|smanship|speople|work|ed|ing)?\b|woodworking|\bceramic(s|ist)?\b|fabrication|bike\s*repair)/i],
    ['retail_store',        /(\bretail\b|\bstore\b|boutique|showroom|shopper|beauty\s+brand|\bcosmetics\b|\bapparel\b|\bfashion\s+(house|brand|week|report|editorial|show)\b|luxury\s+brand)/i],
    ['broadcast_studio',    /(broadcast|newsroom|journalist|control\s*room|olympic\s*broadcast|television\s*station|\bobs\b|sports\s*media|editorial\s*desk)/i],
    ['museum_gallery',      /(museum|gallery|\bexhibit(ion)?\b|biennale|salone|triennale|artwork|artist\s+studio|curator|art\s+history|contemporary\s+art)/i],
    ['clinical',            /(clinic\b|clinical|\bhospital(s|ization|ized)?\b|\bpatient\b|\bnurse\b|\bdoctor\b|\btreatment\b|\bmedical\b|\bmedicine\b|clinician|pharmaceutical|pharma\b|life\s*sciences?|healthcare|drug\s+(pipeline|discovery|trial|approval)|\bdrug\s*development\b)/i],
    ['research_lab',        /(research\s*lab|\blaboratory\b|scientist|molecul|\bgenom(e|ics|ic)?\b|biotech|physicist|chemist|\bexperiment(al|s)?\b|climate\s+model|weather\s+data)/i],
    ['finance_office',      /(\bbank(ing)?\b|financial|\bpayments?\b|\binsurance\b|hedge\s*fund|\bwealth\b|\btrading\b|investment|advisor|fintech|\bpayment\s+network\b|\bnexi\b|\badyen\b|\bunicredit\b|\bft\b|financial\s+times|banking\s+group)/i],
    ['library',             /(library|reading\s*room|book\s*collection|academic\s*resource)/i],
    ['classroom',           /(classroom|\blecture\b|\bseminar\b|\bcourse\b|educator|student\s+learning|academic\s+program|professor)/i],
    ['design_studio',       /(design\s*studio|creative\s*studio|design\s*firm|brand\s*studio|art\s*director|graphic\s*designer)/i],
    ['home_interior',       /(\bdomestic\b|\bfamily\b|\bkitchen\b|living\s*room|\bbedroom\b|resident|consumer\s+app|personal\s+use|household)/i],
    ['cafe_bar',            /(café|cafe\b|\bcoffee\s+(bar|shop|house)\b|espresso|wine\s*bar|bistro)/i],
    ['street_urban',        /(\bstreet\b|\bplaza\b|\btransit\b|\bairport\b|\bstation\b|urban\s*space|public\s*space|park\s*bench)/i],
    ['factory_industrial',  /(\bfactory\b|power\s*plant|manufacturing\s*plant|shop\s*floor|assembly\s+line|refinery|\butilities?\b|\benergy\s+(company|sector|firm|producer|infrastructure|transition)\b|\boil\s+(field|company|industry)\b|natural\s+gas|manufactur(er|ing)|infrastructur(e|al)|shipbuild|automotive\s+production)/i],
    ['research_lab',        /(scientific\s+research|research\s+institute)/i],
    ['policy_lobby',        /(\bpolicy\b|\bgovernment\b|\bministry\b|\bfoundation\b|think\s*tank|advocacy|non-?profit|\bundp\b|\bwho\b|world\s*bank|world\s*economic\s*forum|climate\s*policy|sustainability\s*(report|program)|\bglobal\s+fund\b)/i],
    ['editorial_publication', /(\bmarketing\b|\badvertising\b|\be-?commerce\b|thought\s*leadership|editorial|\bmagazine\b|annual\s+report|integrated\s+report|smart\s+print|report\s+design|editorial\s+layout|editorial\s+product)/i],
  ]

  for (const [key, rx] of patterns) {
    if (rx.test(combined)) {
      const pool = ENV_POOLS[key]
      return { text: pool[seed % pool.length], category: key }
    }
  }

  if (device === 'wall_screen' || device === 'wall_projection' || device === 'kiosk') {
    return { text: ENV_POOLS.wall_display[seed % ENV_POOLS.wall_display.length], category: 'wall_display' }
  }
  if (PRINT_KEYS.has(device)) {
    return { text: ENV_POOLS.print_context[seed % ENV_POOLS.print_context.length], category: 'print_context' }
  }
  return { text: ENV_POOLS.fallback_architectural[seed % ENV_POOLS.fallback_architectural.length], category: 'fallback_architectural' }
}

// ────────────────────────────────────────────────────────────────────────────
// Eligibility + source picker
// ────────────────────────────────────────────────────────────────────────────

const VIDEO_ONLY_KEYWORDS = /^(video|animation|motion\s*graphic|film)$/i

export interface EligibilityResult {
  eligible: boolean
  reason: string
}

export function checkEligibility(project: Project, mediaFilenames: string[]): EligibilityResult {
  const nonInuseSources = mediaFilenames.filter(f => !/_inuse[_.]/i.test(f) && /\.(webp|png|jpe?g|gif)$/i.test(f))
  if (nonInuseSources.length === 0) {
    return { eligible: false, reason: 'no eligible source image (no non-inuse image files in storage)' }
  }
  const output = (project.output || '').toLowerCase().trim()
  if (VIDEO_ONLY_KEYWORDS.test(output)) {
    return { eligible: false, reason: `output type "${project.output}" is video-only, no static UI to composite` }
  }
  if (/immersive.*activation|immersive.*brand|physical.*installation|mural|sculpture/i.test(output) && !/(dashboard|report|book|poster|magazine|app|web|interactive|scrollytelling|platform|guideline)/i.test(output)) {
    return { eligible: false, reason: `output "${project.output}" reads as physical-only (no screen or print artifact)` }
  }
  return { eligible: true, reason: 'has source image and screen-compatible output category' }
}

/** Pick the best available source image (heuristic — later replaced by
 *  the classifier which returns the actual chosen file). */
export function pickSourceImage(project: Project, mediaFilenames: string[]): string | null {
  const eligible = mediaFilenames.filter(f => !/_inuse[_.]/i.test(f) && /\.(webp|png|jpe?g|gif)$/i.test(f))
  if (eligible.length === 0) return null
  const hero = project.heroImage
  if (hero && !/_inuse[_.]/i.test(hero) && eligible.includes(hero)) return hero
  const ordered = project.mediaOrder?.find(f => eligible.includes(f))
  return ordered || eligible[0]
}

/** All candidate source images in order of preference — the classifier will
 *  walk this list and pick the first one that reads as UI/mockup. */
export function candidateSourceImages(project: Project, mediaFilenames: string[]): string[] {
  const eligible = mediaFilenames.filter(f => !/_inuse[_.]/i.test(f) && /\.(webp|png|jpe?g|gif)$/i.test(f))
  const seen = new Set<string>()
  const out: string[] = []
  const push = (f: string | undefined | null) => {
    if (f && eligible.includes(f) && !seen.has(f)) { seen.add(f); out.push(f) }
  }
  push(project.heroImage)
  for (const f of (project.mediaOrder || [])) push(f)
  for (const f of eligible) push(f)
  return out
}

// ────────────────────────────────────────────────────────────────────────────
// Device inference (subject-driven, before source-aspect override)
// ────────────────────────────────────────────────────────────────────────────

function inferDeviceFromSubject(project: Project): { device: string; reason: string } {
  const combined = `${(project.description || '').toLowerCase()} ${(project.output || '').toLowerCase()} ${(project.services || []).join(' ').toLowerCase()} ${(project.domains || []).join(' ').toLowerCase()}`

  if (/(book|report|publication|magazine|editorial\s+print|annual\s+report)/i.test(combined)) return { device: 'book', reason: 'output suggests bound print' }
  if (/(poster|leaflet|brochure|flyer)/i.test(combined)) return { device: 'poster', reason: 'output suggests loose print' }
  if (/(wall|installation|exhibit|gallery|museum|mural|large.?screen|projection)/i.test(combined) && !/(mobile\s*app|smartphone|iphone)/i.test(combined)) return { device: /kiosk|touchscreen/i.test(combined) ? 'kiosk' : 'wall_screen', reason: 'architectural or exhibition display' }
  if (/(mobile\s*app|native\s*app|ios\s*app|android\s*app|smartphone|iphone)/i.test(combined)) return { device: 'smartphone', reason: 'mobile app' }
  if (/(tablet|ipad)/i.test(combined)) return { device: 'tablet', reason: 'tablet form factor' }
  if (/(dashboard|analytics|monitor|control\s+room|command\s+center|enterprise|bi\b|business\s+intelligence)/i.test(combined)) return { device: 'desktop_computer', reason: 'enterprise / monitor context' }
  return { device: 'laptop', reason: 'default (web / interactive / general digital)' }
}

/** Map source-image aspect ratio to a coherent device, overriding subject
 *  inference when the image clearly implies a different form factor. */
export function deviceFromAspectRatio(width: number, height: number, current: string): string {
  const ratio = width / height
  // Very portrait → phone (unless it's already a print product)
  if (!PRINT_KEYS.has(current) && ratio < 0.75) return 'smartphone'
  // Portrait but not extreme → tablet
  if (!PRINT_KEYS.has(current) && ratio < 0.95 && ratio >= 0.75) return current === 'wall_screen' ? current : 'tablet'
  // Very wide (2.5:1+) → keep wall_screen if inferred, else desktop
  if (ratio > 2.5) return current === 'laptop' ? 'desktop_computer' : current
  // Standard landscape → whatever was inferred
  return current
}

// ────────────────────────────────────────────────────────────────────────────
// Public entry point
// ────────────────────────────────────────────────────────────────────────────

export interface InferredParams {
  device: string
  surface?: string
  includeHuman: boolean
  framing: FramingKey
  environment: string
  /** Extended fields not in the original interface. */
  cast: string
  framingRecipe: FramingRecipe
  photoStyle: PhotoStyle
  reason: string
}

export function inferInUseParams(project: Project): InferredParams {
  const seed = hash(project.id)
  const { device, reason: deviceReason } = inferDeviceFromSubject(project)

  let surface: string | undefined
  if (PRINT_KEYS.has(device)) {
    if (device === 'poster' || device === 'billboard') surface = 'wall_mounted'
    else if (device === 'magazine' || device === 'leaflet') surface = 'held_in_hands'
    else surface = 'desk_or_table'
  }

  const framingRecipe = pickFraming(seed >>> 1)
  const cast = pickCastArchetype(project, seed >>> 17)
  const { text: environment, category: envCategory } = pickEnvironment(project, device, seed >>> 19)
  const photoStyle = pickPhotoStyle(seed)

  return {
    device,
    surface,
    includeHuman: true,
    framing: 'hands_only', // legacy field; framingRecipe carries the actual instruction
    environment,
    cast,
    framingRecipe,
    photoStyle,
    reason: `device: ${deviceReason}. environment: ${envCategory}. framing: ${framingRecipe.key}. cast pool: matched to project subject.`,
  }
}
