import { NextResponse } from 'next/server'
import { GoogleGenAI, Modality } from '@google/genai'
import { createServiceClient } from '@/lib/supabase'
import type { FramingKey } from '@/components/edit/in-use-options'
import { requireEditor } from '@/lib/api-auth'
import { buildInUsePrompt } from '@/lib/inuse-prompt'

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

function mimeTypeForFilename(filename: string): string {
  const lower = filename.toLowerCase()
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.webp')) return 'image/webp'
  if (lower.endsWith('.gif')) return 'image/gif'
  return 'image/jpeg'
}

function extractImageFromResponse(response: Awaited<ReturnType<GoogleGenAI['models']['generateContent']>>) {
  for (const candidate of response.candidates || []) {
    for (const part of candidate.content?.parts || []) {
      if (part.inlineData?.data) {
        return {
          image: part.inlineData.data,
          mimeType: part.inlineData.mimeType || 'image/png',
        }
      }
    }
  }
  return null
}

// POST /api/ai/generate-inuse
export async function POST(request: Request) {
  try {
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

    // Config-driven model + API key. The model is stored in
    // config.inuseImageModel so it can be swapped via SQL without a redeploy.
    const { data: configRows } = await supabase.from('config').select('key, value').in('key', ['googleApiKey', 'inuseImageModel'])
    const configMap = new Map<string, string>((configRows || []).map(r => [r.key as string, typeof r.value === 'string' ? r.value.trim() : (r.value as string)]))
    const googleApiKey = configMap.get('googleApiKey')
    if (!googleApiKey) {
      return NextResponse.json({ error: 'Google API key not configured. Set it in Settings.' }, { status: 500 })
    }
    const modelId = configMap.get('inuseImageModel') || 'gemini-3-pro-image'

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
      .maybeSingle()
    const styleTemplate = (settingsData?.value as string) || DEFAULT_STYLE_TEMPLATE

    // Fetch source image from Supabase storage
    const imageUrl = `${SUPABASE_URL}/storage/v1/object/public/project-media/${project.folder_name}/${imageFilename}`
    const imgResponse = await fetch(imageUrl)
    if (!imgResponse.ok) {
      return NextResponse.json({ error: 'Could not fetch source image' }, { status: 400 })
    }
    const imageBuffer = Buffer.from(await imgResponse.arrayBuffer())
    const base64Image = imageBuffer.toString('base64')
    const mimeType = mimeTypeForFilename(imageFilename)

    // Prompt: shared builder — layers the ai_settings style template with the
    // per-generation instructions AND the server-enforced hard rules
    // (fidelity, light physics, bezel, anti-artifact). The user-editable
    // template cannot soften the hard rules.
    const prompt = buildInUsePrompt({
      styleTemplate,
      device,
      surface,
      includeHuman: includeHuman !== false,
      framing,
      environment: environment || '',
    })

    const ai = new GoogleGenAI({ apiKey: googleApiKey })

    const generateOne = async () => {
      try {
        const response = await ai.models.generateContent({
          model: modelId,
          contents: [
            {
              role: 'user',
              parts: [
                { inlineData: { mimeType, data: base64Image } },
                { text: prompt },
              ],
            },
          ],
          config: {
            responseModalities: [Modality.TEXT, Modality.IMAGE],
            imageConfig: { aspectRatio: '16:9' },
          },
        })

        const image = extractImageFromResponse(response)
        if (image) {
          return { success: true as const, image: image.image, mimeType: image.mimeType }
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
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 })
  }
}

export const maxDuration = 120
