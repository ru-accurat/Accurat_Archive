import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { DEVICES, PRINT_KEYS, SURFACES, FRAMINGS, type FramingKey } from '@/components/edit/in-use-options'
import { requireEditor } from '@/lib/api-auth'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

const DEFAULT_STYLE_TEMPLATE = `# Accurat In-Use Photography Style

## Visual style
- Photorealistic, editorial photography
- Natural lighting (window light or soft daylight), no studio look
- Neutral color palette, slight desaturation
- Shallow depth of field with the device/screen as the focal point
- Aspect ratio: 16:9 landscape (uniform across all generations)

## Quality requirements
- 8K resolution, sharp focus on the device/screen
- Screen content must be perfectly legible and match the source image
- No motion blur, no compression artifacts

## Composition rules
- The device or print product must occupy 50–70% of the frame
- When humans are included, prioritize hands and the device — not faces
- Never show a full face — frame from the back, side, or above
- The screen/print is always the visual hero

## Hard constraints
- Never include text overlays, watermarks, or UI chrome
- Never include other devices in the frame
- Never use a sterile studio background unless explicitly requested
- The source image content is the screen — render it exactly, do not modify`

interface InUseBody {
  projectId?: string
  imageFilename?: string
  device?: string
  surface?: string
  includeHuman?: boolean
  framing?: FramingKey
  environment?: string
}

function buildPrompt(
  styleTemplate: string,
  deviceKey: string,
  surfaceKey: string | undefined,
  includeHuman: boolean,
  framingKey: FramingKey | undefined,
  environment: string
): string {
  const device = DEVICES.find((d) => d.key === deviceKey)
  const deviceLabel = device ? device.label.toLowerCase() : deviceKey
  const isPrint = PRINT_KEYS.has(deviceKey)

  const parts: string[] = []
  parts.push(styleTemplate.trim())
  parts.push('\n---\n')
  parts.push(
    `Generate a photorealistic 16:9 image of a ${deviceLabel} showing the project screen.`
  )

  if (isPrint && surfaceKey) {
    const surface = SURFACES.find((s) => s.key === surfaceKey)
    if (surface) {
      parts.push(`The ${deviceLabel} is ${surface.phrasing}.`)
    }
  }

  if (includeHuman) {
    const framing = FRAMINGS.find((f) => f.key === (framingKey ?? 'hands_only'))
    if (framing) {
      parts.push(`Composition: ${framing.phrasing}`)
    }
  } else {
    parts.push('No people in the frame. The device sits in the environment alone.')
  }

  if (environment && environment.trim()) {
    parts.push(`Setting: ${environment.trim()}.`)
  }

  parts.push(
    'CRITICAL: The image content on the screen must match the source image provided exactly. Do not modify, recolor, or reinterpret the screen content.'
  )

  return parts.join('\n\n')
}

// POST /api/ai/generate-inuse
export async function POST(request: Request) {
  const deny = await requireEditor()
  if (deny) return deny
  const supabase = createServiceClient()
  const body = (await request.json()) as InUseBody
  const { projectId, imageFilename, device, surface, includeHuman, framing, environment } = body

  if (!projectId || !imageFilename) {
    return NextResponse.json({ error: 'projectId and imageFilename required' }, { status: 400 })
  }
  if (!device) {
    return NextResponse.json({ error: 'device required' }, { status: 400 })
  }

  // Get Google API key from config
  const { data: configData } = await supabase.from('config').select('*').eq('key', 'googleApiKey').single()
  const googleApiKey = configData?.value
  if (!googleApiKey) {
    return NextResponse.json({ error: 'Google API key not configured. Set it in Settings.' }, { status: 500 })
  }

  // Get project folder
  const { data: project } = await supabase
    .from('projects')
    .select('folder_name')
    .eq('id', projectId)
    .single()
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  // Load universal style template from ai_settings
  const { data: settingsData } = await supabase
    .from('ai_settings')
    .select('value')
    .eq('key', 'inuse_prompt')
    .single()
  const styleTemplate = settingsData?.value || DEFAULT_STYLE_TEMPLATE

  // Fetch source image from Supabase storage
  const imageUrl = `${SUPABASE_URL}/storage/v1/object/public/project-media/${project.folder_name}/${imageFilename}`
  const imgResponse = await fetch(imageUrl)
  if (!imgResponse.ok) {
    return NextResponse.json({ error: 'Could not fetch source image' }, { status: 400 })
  }
  const imageBuffer = Buffer.from(await imgResponse.arrayBuffer())
  const base64Image = imageBuffer.toString('base64')
  const mimeType = imageFilename.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg'

  const prompt = buildPrompt(
    styleTemplate,
    device,
    surface,
    includeHuman !== false,
    framing,
    environment || ''
  )

  const genai = new GoogleGenerativeAI(googleApiKey)
  const model = genai.getGenerativeModel({ model: 'gemini-2.5-flash-image' })

  const generateOne = async () => {
    try {
      const result = await model.generateContent({
        contents: [
          {
            role: 'user',
            parts: [
              { inlineData: { mimeType, data: base64Image } },
              { text: prompt },
            ],
          },
        ],
        generationConfig: {
          responseModalities: ['IMAGE', 'TEXT'] as unknown as undefined,
        } as Record<string, unknown>,
      })

      const response = result.response
      for (const candidate of response.candidates || []) {
        for (const part of candidate.content?.parts || []) {
          if (part.inlineData?.data) {
            return {
              success: true as const,
              image: part.inlineData.data,
              mimeType: part.inlineData.mimeType || 'image/png',
            }
          }
        }
      }
      return { success: false as const, error: 'No image in response' }
    } catch (err) {
      return { success: false as const, error: err instanceof Error ? err.message : 'Generation failed' }
    }
  }

  // Two parallel calls with the same deterministic prompt (model samples differently)
  const [result1, result2] = await Promise.all([generateOne(), generateOne()])

  const images: { data: string; mimeType: string }[] = []
  if (result1.success) images.push({ data: result1.image, mimeType: result1.mimeType })
  if (result2.success) images.push({ data: result2.image, mimeType: result2.mimeType })

  if (images.length === 0) {
    const err1 = result1.success ? '' : result1.error
    const err2 = result2.success ? '' : result2.error
    return NextResponse.json(
      { error: `Both generations failed. Error 1: ${err1}. Error 2: ${err2}` },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true, images, prompt })
}

export const maxDuration = 120
