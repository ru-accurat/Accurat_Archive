import { DEVICES, PRINT_KEYS, SURFACES, FRAMINGS, type FramingKey } from '@/components/edit/in-use-options'
import type { FramingRecipe, PhotoStyle } from './inuse-auto-params'

/** Hard technical requirements baked into every in-use prompt. Not editable
 *  via ai_settings — these must survive any style-template rewrite. */
const HARD_RULES = [
  'HARD TECHNICAL REQUIREMENTS:',
  '',
  'Screen-content fidelity — this is the most important instruction:',
  '- The reference image provided is the exact pixel content of the device screen.',
  '- Do NOT redraw, resample, re-render, restyle, translate, or reinterpret any text, chart, glyph, icon, or graphic element on the screen.',
  '- Every character, digit, and shape on the screen must match the reference byte-for-byte in position, color, and typography.',
  '- Treat this as a compositing task, not a generative one. The reference image goes onto the device screen unchanged; only the surrounding scene is generated.',
  '- If the reference contains small text, keep it small — do NOT enlarge, redraw, or "improve" it. If some characters would be physically unreadable at the rendered scale, leave them slightly blurred rather than substituting new letters.',
  '',
  'Light physics:',
  '- The screen is a physical light source that emits light into the scene.',
  "- Render subtle screen-glow reflections on nearby matte surfaces (skin, wood, concrete, glass) and a soft color cast in shadows adjacent to the screen, consistent with the dominant colors of the reference image.",
  '- The screen must feel physically luminous, not pasted on. No floating rectangle look.',
  '',
  'Bezel and frame realism:',
  '- The device bezel, edge, and physical frame must be photographically consistent with the device model named in the prompt. Correct thickness, correct materials, no cartoonish borders, no simplified screen edges.',
  '- Print products (books, posters, reports) must have paper texture, correct fold/edge behavior, and realistic light interaction with matte/glossy surfaces.',
  '',
  'Anti-artifact:',
  '- No AI watermarks, no visible upscaling seams, no oversharpened edges, no plastic skin, no repeated pattern noise, no phantom or ghost text.',
  '- No text overlays, UI chrome, or extra devices in the frame beyond what is described.',
  '- Modern digital photography only. No visible film grain, no vintage color filters, no cross-processed looks. Keep the rendering contemporary and clean.',
].join('\n')

export interface BuildPromptInput {
  styleTemplate: string
  device: string
  surface?: string
  includeHuman: boolean
  /** Legacy framing key (kept for backwards compat with the API route). */
  framing?: FramingKey
  environment: string
  /** New extended fields — optional so the API route can call this with just the basics. */
  cast?: string
  framingRecipe?: FramingRecipe
  photoStyle?: PhotoStyle
}

export function buildInUsePrompt({
  styleTemplate,
  device,
  surface,
  includeHuman,
  framing,
  environment,
  cast,
  framingRecipe,
  photoStyle,
}: BuildPromptInput): string {
  const deviceOpt = DEVICES.find(d => d.key === device)
  const deviceLabel = deviceOpt ? deviceOpt.label.toLowerCase() : device
  const isPrint = PRINT_KEYS.has(device)

  const parts: string[] = []
  parts.push(styleTemplate.trim())
  parts.push('---')
  parts.push(`Generate a photorealistic 16:9 image of a ${deviceLabel} showing the project screen.`)

  if (isPrint && surface) {
    const s = SURFACES.find(x => x.key === surface)
    if (s) parts.push(`The ${deviceLabel} is ${s.phrasing}.`)
  }

  if (includeHuman) {
    if (framingRecipe) {
      parts.push(`Framing: ${framingRecipe.phrasing}`)
    } else {
      const f = FRAMINGS.find(x => x.key === (framing ?? 'hands_only'))
      if (f) parts.push(`Framing: ${f.phrasing}`)
    }
    if (cast) {
      parts.push(`Person in the frame: ${cast}. Only their hands, forearms, shoulder, or partial back are visible — no face, no smile, no eye contact. They are engaged with the device naturally, mid-use, not posing.`)
    }
  } else {
    parts.push('No people in the frame. The device sits in the environment alone.')
  }

  if (environment && environment.trim()) {
    parts.push(`Setting: ${environment.trim()}.`)
  }

  if (photoStyle) {
    parts.push([
      'Photographic treatment (all modern digital, no film grain or vintage filters):',
      `- Camera: ${photoStyle.camera}.`,
      `- Lens: ${photoStyle.focal}.`,
      `- Color grade: ${photoStyle.grade}.`,
      `- Light quality: ${photoStyle.light}.`,
      `- Time of day: ${photoStyle.time}.`,
    ].join('\n'))
  }

  parts.push(HARD_RULES)

  return parts.join('\n\n')
}
