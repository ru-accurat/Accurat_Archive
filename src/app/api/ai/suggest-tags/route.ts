import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import Anthropic from '@anthropic-ai/sdk'
import { requireEditor } from '@/lib/api-auth'

const FALLBACK_GUIDELINES = `Accurat tag guidelines: choose 3-5 concise, reusable tags for domains (industries/topics like "Finance", "Climate", "Culture") and services (capabilities like "Data Visualization", "Dashboard", "Research"). Prefer reusing existing tags from the available lists when they fit. Only add new tags when nothing in the existing list fits.`

async function loadTagGuidelines(supabase: ReturnType<typeof createServiceClient>): Promise<string> {
  const { data } = await supabase.from('ai_settings').select('key, value')
  if (!data || data.length === 0) return FALLBACK_GUIDELINES
  const settings: Record<string, string> = {}
  for (const row of data) {
    if (row.value) settings[row.key] = row.value
  }
  const parts: string[] = [settings.guidelines || FALLBACK_GUIDELINES]
  if (settings.voice) parts.push('\n\n# Voice\n' + settings.voice)
  return parts.join('\n')
}

// Extract the first JSON object from a response string.
function extractJson(text: string): unknown {
  const trimmed = text.trim()
  // strip fences if present
  const cleaned = trimmed.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '')
  try {
    return JSON.parse(cleaned)
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/)
    if (match) {
      try {
        return JSON.parse(match[0])
      } catch {
        return null
      }
    }
    return null
  }
}

function uniqueClean(arr: unknown, exclude: Set<string>): string[] {
  if (!Array.isArray(arr)) return []
  const seen = new Set<string>()
  const result: string[] = []
  for (const item of arr) {
    if (typeof item !== 'string') continue
    const v = item.trim()
    if (!v) continue
    const key = v.toLowerCase()
    if (seen.has(key)) continue
    if (exclude.has(key)) continue
    seen.add(key)
    result.push(v)
    if (result.length >= 5) break
  }
  return result
}

export async function POST(request: Request) {
  const deny = await requireEditor()
  if (deny) return deny
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ success: false, message: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
  }

  let body: {
    description?: string
    currentDomains?: string[]
    currentServices?: string[]
    availableDomains?: string[]
    availableServices?: string[]
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, message: 'Invalid JSON' }, { status: 400 })
  }

  const description = (body.description || '').trim()
  if (description.length < 40) {
    return NextResponse.json({ success: true, domains: [], services: [] })
  }

  const currentDomains = body.currentDomains || []
  const currentServices = body.currentServices || []
  const availableDomains = body.availableDomains || []
  const availableServices = body.availableServices || []

  const excludeDomains = new Set(currentDomains.map((s) => s.toLowerCase()))
  const excludeServices = new Set(currentServices.map((s) => s.toLowerCase()))

  const supabase = createServiceClient()
  const systemPrompt = await loadTagGuidelines(supabase)

  const userPrompt = `Analyse this case study description and suggest 3-5 relevant tags.

DESCRIPTION:
${description}

ALREADY ASSIGNED (do NOT suggest these):
Domains: ${currentDomains.join(', ') || '(none)'}
Services: ${currentServices.join(', ') || '(none)'}

EXISTING TAG LIBRARY (strongly prefer reusing these when they fit):
Available domains: ${availableDomains.join(', ') || '(none)'}
Available services: ${availableServices.join(', ') || '(none)'}

Return STRICT JSON matching this schema, with no fences, no preamble, no commentary:
{"domains": ["..."], "services": ["..."], "output": "Data Visualization"}

Rules:
- "domains": up to 3 domain tags (industry/topic)
- "services": up to 3 service tags (capability/deliverable type)
- "output": optional single category ("Data Visualization", "Dashboard", "Installation", "Research", etc) — omit if unsure
- Prefer tags from the existing library. Only invent new ones if nothing fits.
- Do not include any tag already assigned.`

  try {
    const anthropic = new Anthropic({ apiKey })
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 512,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const parsed = extractJson(text) as { domains?: unknown; services?: unknown; output?: unknown } | null

    if (!parsed) {
      return NextResponse.json({ success: false, message: 'Failed to parse suggestions' }, { status: 502 })
    }

    const domains = uniqueClean(parsed.domains, excludeDomains)
    const services = uniqueClean(parsed.services, excludeServices)
    const output = typeof parsed.output === 'string' && parsed.output.trim() ? parsed.output.trim() : undefined

    return NextResponse.json({ success: true, domains, services, output })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'AI suggestion failed'
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
