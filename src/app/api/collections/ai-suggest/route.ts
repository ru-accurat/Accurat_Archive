import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServiceClient } from '@/lib/supabase'
import { rowToProjectSummary, type ProjectSummaryRow } from '@/lib/db-utils'
import {
  buildSuggestPrompt,
  extractJson,
  loadStyleGuide,
  type TrimmedProject,
} from '@/lib/ai-collection-prompts'

const SUMMARY_COLUMNS = [
  'id', 'full_name', 'client', 'project_name', 'tier', 'section',
  'start_year', 'end_year', 'domains', 'services', 'tagline', 'description',
  'challenge', 'solution', 'deliverables', 'client_quotes',
  'team', 'urls', 'output', 'folder_name', 'media_order', 'hero_image',
  'thumb_image', 'ai_generated', 'client_logo', 'status', 'location_name',
  'latitude', 'longitude',
].join(',')

// POST /api/collections/ai-suggest — { brief } → { suggestions: [{ projectId, relevance }] }
export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
  }

  const body = await request.json()
  const brief: string = body?.brief || ''
  if (!brief.trim()) {
    return NextResponse.json({ error: 'brief is required' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('projects')
    .select(SUMMARY_COLUMNS)
    .order('client', { ascending: true })
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const summaries = (data as unknown as ProjectSummaryRow[]).map(rowToProjectSummary)
  const validIds = new Set(summaries.map((p) => p.id))

  // Trim each project to keep prompt small
  const trimmed: TrimmedProject[] = summaries.map((p) => ({
    id: p.id,
    client: p.client,
    projectName: p.projectName,
    tagline: p.tagline || undefined,
    description: p.description ? p.description.slice(0, 600) : undefined,
    domains: p.domains?.length ? p.domains : undefined,
    services: p.services?.length ? p.services : undefined,
    output: p.output || undefined,
    section: p.section || undefined,
  }))

  const styleGuide = await loadStyleGuide(supabase)
  const { system, user } = buildSuggestPrompt(brief, trimmed, styleGuide)

  try {
    const anthropic = new Anthropic({ apiKey })
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system,
      messages: [{ role: 'user', content: user }],
    })

    const text = response.content[0]?.type === 'text' ? response.content[0].text : ''
    let parsed: { suggestions?: { projectId?: string; relevance?: string }[] }
    try {
      parsed = extractJson(text)
    } catch (e) {
      return NextResponse.json(
        { error: 'Claude returned malformed JSON', raw: text.slice(0, 500) },
        { status: 502 }
      )
    }

    const rawSuggestions = Array.isArray(parsed?.suggestions) ? parsed.suggestions : []
    // Validate IDs, drop hallucinations, dedupe, cap at 8
    const seen = new Set<string>()
    const suggestions: { projectId: string; relevance: string }[] = []
    for (const s of rawSuggestions) {
      if (!s?.projectId || !s?.relevance) continue
      if (!validIds.has(s.projectId)) continue
      if (seen.has(s.projectId)) continue
      seen.add(s.projectId)
      suggestions.push({ projectId: s.projectId, relevance: String(s.relevance).trim() })
      if (suggestions.length >= 8) break
    }

    return NextResponse.json({
      suggestions,
      tokensUsed: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'AI suggest failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
