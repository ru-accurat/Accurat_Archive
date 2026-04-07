import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServiceClient } from '@/lib/supabase'
import { rowToProjectSummary, type ProjectSummaryRow } from '@/lib/db-utils'
import {
  buildRelevancePrompt,
  extractJson,
  loadStyleGuide,
  type TrimmedProject,
} from '@/lib/ai-collection-prompts'

// POST /api/collections/ai-relevance — { brief, projectId } → { relevance }
export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
  }

  const body = await request.json()
  const brief: string = body?.brief || ''
  const projectId: string = body?.projectId || ''
  if (!brief.trim() || !projectId) {
    return NextResponse.json({ error: 'brief and projectId are required' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single()
  if (error || !data) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  const summary = rowToProjectSummary(data as unknown as ProjectSummaryRow)
  const trimmed: TrimmedProject = {
    id: summary.id,
    client: summary.client,
    projectName: summary.projectName,
    tagline: summary.tagline || undefined,
    description: summary.description ? summary.description.slice(0, 800) : undefined,
    domains: summary.domains?.length ? summary.domains : undefined,
    services: summary.services?.length ? summary.services : undefined,
    output: summary.output || undefined,
    section: summary.section || undefined,
  }

  const styleGuide = await loadStyleGuide(supabase)
  const { system, user } = buildRelevancePrompt(brief, trimmed, styleGuide)

  try {
    const anthropic = new Anthropic({ apiKey })
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 512,
      system,
      messages: [{ role: 'user', content: user }],
    })
    const text = response.content[0]?.type === 'text' ? response.content[0].text : ''
    let parsed: { relevance?: string }
    try {
      parsed = extractJson(text)
    } catch {
      // Fallback: treat the raw text as the paragraph
      parsed = { relevance: text.trim() }
    }
    const relevance = String(parsed?.relevance || '').trim()
    if (!relevance) {
      return NextResponse.json({ error: 'Empty relevance' }, { status: 502 })
    }
    return NextResponse.json({ relevance })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'AI relevance failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
