import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { rowToProject, type ProjectRow } from '@/lib/db-utils'
import { logActivity } from '@/lib/activity'
import { requireEditor, requireSignedIn } from '@/lib/api-auth'

type Supabase = ReturnType<typeof createServiceClient>

// The website lists a project when deck_no (its Library number) is set AND status is 'public'
// (see the website_projects view). These routes read and change deck_no.

/** What a project must have before it can go on the website: every live project has all of it. */
async function readinessChecks(supabase: Supabase, project: ProjectRow) {
  const { data: media } = await supabase
    .from('project_media')
    .select('kind, role, is_hero, is_thumbnail')
    .eq('project_id', project.id)
    .eq('bucket', 'project-media')
    .eq('role', 'selected')
  const selected = media || []
  return [
    { key: 'selected', label: 'At least one selected media file', ok: selected.length > 0 },
    { key: 'hero', label: 'A selected image set as hero', ok: selected.some((m) => m.is_hero && m.kind === 'image') },
    { key: 'thumbnail', label: 'A selected image set as thumbnail', ok: selected.some((m) => m.is_thumbnail && m.kind === 'image') },
    { key: 'category', label: 'A category', ok: project.category_id != null },
    { key: 'offerings', label: 'At least one offering', ok: (project.offerings?.length ?? 0) > 0 },
    { key: 'whatWeMade', label: '"What we made" text', ok: !!project.what_we_made?.trim() },
  ]
}

async function nextFreeNumber(supabase: Supabase) {
  const { data } = await supabase
    .from('projects')
    .select('deck_no')
    .not('deck_no', 'is', null)
    .order('deck_no', { ascending: false })
    .limit(1)
  return ((data?.[0]?.deck_no as number | undefined) ?? 0) + 1
}

// GET /api/projects/[id]/website: current state, readiness checks and the next free number
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const deny = await requireSignedIn()
  if (deny) return deny
  const { id } = await params
  const supabase = createServiceClient()
  const { data: project } = await supabase.from('projects').select('*').eq('id', id).single()
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const row = project as ProjectRow
  return NextResponse.json({
    deckNo: row.deck_no ?? null,
    live: row.deck_no != null && row.status === 'public',
    nextFree: await nextFreeNumber(supabase),
    checks: await readinessChecks(supabase, row),
  })
}

// POST /api/projects/[id]/website  Body: { deckNo: number | null }
// A number puts the project on the website (or changes its Library number); null removes it.
// Putting a project on is blocked until every readiness check passes. Numbers are unique.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const deny = await requireEditor()
  if (deny) return deny
  const { id } = await params
  const body = await request.json().catch(() => null) as { deckNo?: unknown } | null
  const deckNo = body?.deckNo
  if (deckNo !== null && !(Number.isInteger(deckNo) && (deckNo as number) >= 1 && (deckNo as number) <= 999)) {
    return NextResponse.json({ error: 'Send deckNo: a whole number from 1 to 999, or null to remove' }, { status: 400 })
  }
  const next = deckNo as number | null

  const supabase = createServiceClient()
  const { data: current } = await supabase.from('projects').select('*').eq('id', id).single()
  if (!current) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  const project = current as ProjectRow
  const previous = project.deck_no ?? null
  if (previous === next) return NextResponse.json(rowToProject(project))

  if (next != null) {
    const { data: holder } = await supabase
      .from('projects')
      .select('id, full_name')
      .eq('deck_no', next)
      .neq('id', id)
      .maybeSingle()
    if (holder) {
      return NextResponse.json({ error: `Library ${String(next).padStart(3, '0')} is already used by ${holder.full_name}` }, { status: 409 })
    }
  }

  if (previous == null && next != null) {
    const missing = (await readinessChecks(supabase, project)).filter((c) => !c.ok)
    if (missing.length > 0) {
      return NextResponse.json({ error: 'Not ready for the website', problems: missing.map((c) => c.label) }, { status: 409 })
    }
  }

  const note = previous == null ? 'Archive app: put on the website'
    : next == null ? 'Archive app: removed from the website'
      : 'Archive app: Library number changed'
  const { error: logError } = await supabase.from('consolidation_log').insert({
    batch: `app-website-${new Date().toISOString().slice(0, 10)}`,
    project_id: id, table_name: 'projects', record_id: id, field: 'deck_no',
    old_value: previous, new_value: next, source: 'manual', note,
  })
  if (logError) return NextResponse.json({ error: `Log failed, nothing changed: ${logError.message}` }, { status: 500 })

  await supabase.from('project_history').insert({ project_id: id, snapshot: project })

  const { data: updated, error } = await supabase
    .from('projects')
    .update({ deck_no: next })
    .eq('id', id)
    .select()
    .single()
  if (error) {
    // 23505: another request took the number between the check and the update
    const status = error.code === '23505' ? 409 : 500
    return NextResponse.json({ error: status === 409 ? 'That Library number was just taken; pick another' : error.message }, { status })
  }

  await logActivity('project.updated', { projectName: project.full_name, fields: ['deck_no'], from: previous, to: next }, id)
  return NextResponse.json(rowToProject(updated as ProjectRow))
}
