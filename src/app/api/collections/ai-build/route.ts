import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServiceClient } from '@/lib/supabase'
import {
  buildBuildPrompt,
  extractJson,
  loadStyleGuide,
} from '@/lib/ai-collection-prompts'

interface InputProject {
  id: string
  relevance?: string
}

interface SectionPlan {
  title?: string
  subtitle?: string
  projectIds?: string[]
}

// POST /api/collections/ai-build — { name, brief, projects: [{id, relevance}] } → { collectionId }
export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
  }

  const body = await request.json()
  const name: string = (body?.name || '').trim()
  const brief: string = (body?.brief || '').trim()
  const projects: InputProject[] = Array.isArray(body?.projects) ? body.projects : []

  if (!name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }
  if (!brief) {
    return NextResponse.json({ error: 'brief is required' }, { status: 400 })
  }
  if (projects.length === 0) {
    return NextResponse.json({ error: 'At least one project is required' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Fetch metadata for the projects so we can give Claude human-readable labels.
  const ids = projects.map((p) => p.id)
  const { data: projData, error: projErr } = await supabase
    .from('projects')
    .select('id, client, project_name')
    .in('id', ids)
  if (projErr) {
    return NextResponse.json({ error: projErr.message }, { status: 500 })
  }
  const meta = new Map<string, { client: string; projectName: string }>()
  for (const row of projData || []) {
    meta.set(row.id, { client: row.client, projectName: row.project_name })
  }

  const enriched = projects
    .filter((p) => meta.has(p.id))
    .map((p) => ({
      id: p.id,
      client: meta.get(p.id)!.client,
      projectName: meta.get(p.id)!.projectName,
      relevance: p.relevance || '',
    }))

  if (enriched.length === 0) {
    return NextResponse.json({ error: 'No valid projects' }, { status: 400 })
  }

  const styleGuide = await loadStyleGuide(supabase)
  const { system, user } = buildBuildPrompt(brief, name, enriched, styleGuide)

  let sections: { title: string; subtitle: string; projectIds: string[] }[] = []
  let collectionSubtitle: string = ''
  try {
    const anthropic = new Anthropic({ apiKey })
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system,
      messages: [{ role: 'user', content: user }],
    })
    const text = response.content[0]?.type === 'text' ? response.content[0].text : ''
    let parsed: { collectionSubtitle?: string; sections?: SectionPlan[] }
    try {
      parsed = extractJson(text)
    } catch {
      parsed = { sections: [] }
    }
    if (parsed?.collectionSubtitle) {
      collectionSubtitle = String(parsed.collectionSubtitle).trim().slice(0, 280)
    }
    const validIds = new Set(enriched.map((p) => p.id))
    const used = new Set<string>()
    for (const sec of parsed?.sections || []) {
      const pids = (sec.projectIds || []).filter((id) => validIds.has(id) && !used.has(id))
      pids.forEach((id) => used.add(id))
      if (pids.length === 0) continue
      sections.push({
        title: String(sec.title || 'Untitled').trim().slice(0, 120),
        subtitle: String(sec.subtitle || '').trim().slice(0, 240),
        projectIds: pids,
      })
    }
    // Append any leftover projects to a final catch-all section so nothing is lost
    const leftover = enriched.filter((p) => !used.has(p.id)).map((p) => p.id)
    if (leftover.length > 0) {
      if (sections.length === 0) {
        sections.push({ title: 'Selected work', subtitle: '', projectIds: leftover })
      } else {
        sections[sections.length - 1].projectIds.push(...leftover)
      }
    }
  } catch (err) {
    // If the build prompt fails, fall back to a single section so the user still gets a collection
    sections = [
      {
        title: 'Selected work',
        subtitle: '',
        projectIds: enriched.map((p) => p.id),
      },
    ]
  }

  // 1. Create the collection
  // - subtitle: AI-generated high-level framing of themes / Accurat experience for this brief
  // - description: stores the original brief for reference (not displayed as subtitle anywhere)
  const { data: collection, error: createErr } = await supabase
    .from('collections')
    .insert({ name, subtitle: collectionSubtitle || null, description: brief })
    .select()
    .single()
  if (createErr || !collection) {
    return NextResponse.json({ error: createErr?.message || 'Failed to create collection' }, { status: 500 })
  }
  const collectionId = collection.id as string

  // 2. Create groups
  const groupRecords = sections.map((s, i) => ({
    collection_id: collectionId,
    name: s.title,
    subtitle: s.subtitle || null,
    sort_order: i,
  }))
  const { data: groupRows, error: groupErr } = await supabase
    .from('collection_groups')
    .insert(groupRecords)
    .select()
  if (groupErr) {
    return NextResponse.json({ error: `Group insert failed: ${groupErr.message}`, collectionId }, { status: 500 })
  }

  // 3. Build items, mapping each project to its section's group_id, with the relevance as caption
  const relevanceMap = new Map<string, string>()
  for (const p of enriched) relevanceMap.set(p.id, p.relevance)

  const items: Array<{
    collection_id: string
    project_id: string
    position: number
    group_id: string
    caption: string | null
  }> = []
  let pos = 0
  sections.forEach((sec, i) => {
    const groupId = groupRows?.[i]?.id
    if (!groupId) return
    for (const pid of sec.projectIds) {
      items.push({
        collection_id: collectionId,
        project_id: pid,
        position: pos++,
        group_id: groupId,
        caption: relevanceMap.get(pid) || null,
      })
    }
  })

  if (items.length > 0) {
    const { error: itemsErr } = await supabase
      .from('collection_items')
      .upsert(items, { onConflict: 'collection_id,project_id' })
    if (itemsErr) {
      return NextResponse.json({ error: `Items insert failed: ${itemsErr.message}`, collectionId }, { status: 500 })
    }
  }

  return NextResponse.json({ collectionId })
}
