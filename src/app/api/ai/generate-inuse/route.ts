import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { GoogleGenerativeAI } from '@google/generative-ai'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

// Default photography style block
const DEFAULT_STYLE_BLOCK = `PHOTOGRAPHY STYLE — CRITICAL:
Shot on a Canon EOS R5 with a 35mm f/1.4 lens. Bold, editorial, contemporary feel.
Strong directional lighting with high contrast — deep shadows and bright highlights.
Slight film grain visible. Natural skin texture with visible pores and imperfections.
Candid, not posed. Real texture on all surfaces — scuffs, patina, wear.
Shallow depth of field with creamy bokeh. Colors are slightly desaturated except for the screen content.
The device screen MUST show the provided reference image clearly and recognizably — this is the most important element.
The overall mood is: a premium design portfolio mockup shot, like Mockup Maison or Unsplash editorial.
16:9 landscape aspect ratio.`

const DOMAIN_CONTEXTS: Record<string, string[]> = {
  finance: ['Corner office with city skyline view', 'Airport first-class lounge', 'Penthouse standing desk'],
  pharma: ['Bright pharma office with glass partitions', 'Glass-walled conference room', 'Lab-adjacent office'],
  journalism: ['Concrete steps outside brutalist building', 'Worn newsroom desk', 'Library with concrete columns'],
  museum: ['Raw concrete gallery bench', 'Museum lobby with terrazzo floors', 'White-walled gallery space'],
  retail: ['Fashion brand creative office', 'Design studio with exposed brick', 'Upscale marble-top cafe'],
  government: ['Train station platform', 'Civic building with vaulted ceilings', 'City park metal bench'],
  tech: ['Plywood startup desk', 'Converted warehouse office', 'Home kitchen table at dawn'],
}

const CLIENT_DOMAINS: Record<string, string> = {
  ferrari: 'finance', nexi: 'finance', unicredit: 'finance', fineco: 'finance',
  generali: 'finance', 'black knight': 'finance', 'jp morgan': 'finance',
  chiesi: 'pharma', abbvie: 'pharma', iqvia: 'pharma', elysium: 'pharma',
  lvmh: 'retail', sephora: 'retail', valentino: 'retail', armani: 'retail',
  'corriere della sera': 'journalism', gedi: 'journalism', sifted: 'journalism',
  getty: 'museum', 'triennale milano': 'museum',
  'european commission': 'government', data4change: 'government',
  meta: 'tech', ibm: 'tech', google: 'tech', neom: 'tech',
}

const DEVICES = ['MacBook Pro laptop', 'iPhone 15 Pro', 'iPad Pro', 'Apple Studio Display']
const FRAMINGS = [
  'Over-the-shoulder, medium-tight — device fills 50% of frame',
  'Overhead birds-eye view, looking down at hands and device',
  'Side angle, shallow depth, focus on screen',
  'Tight crop, only hands and device visible',
  'Three-quarter angle from behind, environmental context visible',
]
const SUBJECTS = [
  'A woman in her 30s with curly dark hair, wearing a structured cream blazer over a black turtleneck, gold ear piercings',
  'A man in his 40s with close-cropped gray hair, wearing a navy merino sweater with pushed-up sleeves, minimal watch',
  'A young woman in her 20s with braided hair, wearing an oversized dark wool coat, silver rings',
  'A man in his 50s with salt-and-pepper beard, wearing a charcoal bomber jacket and chunky knit scarf',
  'A woman in her 30s with straight black hair, wearing a sage green utility overshirt, small gold hoops',
  'A man in his 20s with textured fade haircut, wearing a worn black leather jacket over white tee',
]
const LIGHTINGS = [
  'Dramatic natural window light from the left — deep shadows, warm highlights',
  'Harsh overhead spotlight — strong contrast, cool tones with warm screen glow',
  'Soft backlight from large window — silhouette edges, face lit by screen',
  'Mixed warm tungsten + cool daylight — cinematic color contrast',
]

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function detectDomain(client: string): string {
  const lower = client.toLowerCase()
  for (const [key, domain] of Object.entries(CLIENT_DOMAINS)) {
    if (lower.includes(key)) return domain
  }
  return 'tech'
}

function buildPrompt(client: string, userNotes: string | undefined, customGuidelines: string | undefined, variant: number): string {
  const domain = detectDomain(client)
  const contexts = DOMAIN_CONTEXTS[domain] || DOMAIN_CONTEXTS.tech

  // For two variants, pick different combinations
  const seed = variant
  const device = DEVICES[seed % DEVICES.length]
  const framing = FRAMINGS[(seed * 3 + 1) % FRAMINGS.length]
  const subject = SUBJECTS[(seed * 5 + 2) % SUBJECTS.length]
  const context = contexts[(seed * 2) % contexts.length]
  const lighting = LIGHTINGS[(seed * 7) % LIGHTINGS.length]
  const withPerson = variant === 0 // first variant has person, second randomized
  const props = pickRandom(['glasses and a half-empty coffee cup', 'notebook and a pen', 'wireless headphones resting nearby', 'a glass of water on a coaster'])

  const styleBlock = customGuidelines || DEFAULT_STYLE_BLOCK

  // If user provided notes, let them override/supplement the automatic choices
  const notesSection = userNotes
    ? `\n\nUSER DIRECTION (incorporate these preferences, they take priority over defaults):\n${userNotes}`
    : ''

  if (withPerson) {
    return `Generate a photorealistic photograph of a person using ${device} showing this exact data visualization interface on screen.

- Framing: ${framing}
- Person: ${subject}, seen from behind or from above, naturally interacting with the device
- Setting: ${context}
- Lighting: ${lighting}
- Props: ${props}
- The device screen MUST show this exact reference image clearly and recognizably — this is the hero element${notesSection}

${styleBlock}`
  } else {
    return `Generate a photorealistic photograph of ${device} displaying this exact data visualization interface. NO PERSON in the shot.

- Framing: ${framing}
- Setting: ${context}
- Lighting: ${lighting}
- Props: ${props}
- The device screen MUST show this exact reference image clearly and recognizably${notesSection}

${styleBlock}`
  }
}

// POST /api/ai/generate-inuse
export async function POST(request: Request) {
  const supabase = createServiceClient()
  const { projectId, imageFilename, notes } = await request.json()

  if (!projectId || !imageFilename) {
    return NextResponse.json({ error: 'projectId and imageFilename required' }, { status: 400 })
  }

  // Get Google API key from config
  const { data: configData } = await supabase.from('config').select('*').eq('key', 'googleApiKey').single()
  const googleApiKey = configData?.value
  if (!googleApiKey) {
    return NextResponse.json({ error: 'Google API key not configured. Set it in Settings.' }, { status: 500 })
  }

  // Get project info for context
  const { data: project } = await supabase.from('projects').select('client, project_name, folder_name, output').eq('id', projectId).single()
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  // Load custom photography guidelines from ai_settings
  const { data: settingsData } = await supabase.from('ai_settings').select('value').eq('key', 'inuse_prompt').single()
  const customGuidelines = settingsData?.value || undefined

  // Fetch source image from Supabase storage
  const imageUrl = `${SUPABASE_URL}/storage/v1/object/public/project-media/${project.folder_name}/${imageFilename}`
  const imgResponse = await fetch(imageUrl)
  if (!imgResponse.ok) {
    return NextResponse.json({ error: 'Could not fetch source image' }, { status: 400 })
  }
  const imageBuffer = Buffer.from(await imgResponse.arrayBuffer())
  const base64Image = imageBuffer.toString('base64')
  const mimeType = imageFilename.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg'

  // Build two prompts with different variants
  const prompt1 = buildPrompt(project.client, notes, customGuidelines, 0)
  const prompt2 = buildPrompt(project.client, notes, customGuidelines, 1)

  const genai = new GoogleGenerativeAI(googleApiKey)
  const model = genai.getGenerativeModel({ model: 'gemini-2.0-flash-exp-image-generation' })

  // Generate two images in parallel
  const generateOne = async (prompt: string) => {
    try {
      const result = await model.generateContent({
        contents: [{
          role: 'user',
          parts: [
            { inlineData: { mimeType, data: base64Image } },
            { text: prompt },
          ],
        }],
        generationConfig: {
          responseModalities: ['IMAGE', 'TEXT'] as unknown as undefined,
        } as Record<string, unknown>,
      })

      const response = result.response
      for (const candidate of response.candidates || []) {
        for (const part of candidate.content?.parts || []) {
          if (part.inlineData?.data) {
            return {
              success: true,
              image: part.inlineData.data,
              mimeType: part.inlineData.mimeType || 'image/png',
            }
          }
        }
      }
      return { success: false, error: 'No image in response' }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Generation failed' }
    }
  }

  const [result1, result2] = await Promise.all([
    generateOne(prompt1),
    generateOne(prompt2),
  ])

  const images = []
  if (result1.success) images.push({ data: result1.image, mimeType: result1.mimeType })
  if (result2.success) images.push({ data: result2.image, mimeType: result2.mimeType })

  if (images.length === 0) {
    return NextResponse.json({
      error: `Both generations failed. Error 1: ${result1.error}. Error 2: ${result2.error}`,
    }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    images,
    prompts: [prompt1, prompt2],
  })
}

export const maxDuration = 120
