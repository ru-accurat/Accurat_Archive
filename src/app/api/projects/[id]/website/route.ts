import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { rowToProject, type ProjectRow } from '@/lib/db-utils'
import { logActivity } from '@/lib/activity'
import { requireEditor, requireSignedIn } from '@/lib/api-auth'
import { nextFreeLibraryNumber, readinessChecks } from '@/lib/project-status-server'
import { ON_WEBSITE, normalizeStatus } from '@/lib/status'

// Status decides the website (public and private are on it; see lib/status.ts). deck_no is the
// Library number: assigned when a project first goes on, kept (reserved) when it leaves.
// These routes read the state and change an existing Library number.

// GET /api/projects/[id]/website: Library number, whether it is on the website, readiness checks
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
    live: ON_WEBSITE.has(normalizeStatus(row.status)) && row.deck_no != null,
    nextFree: await nextFreeLibraryNumber(supabase),
    checks: await readinessChecks(supabase, row),
  })
}

// POST /api/projects/[id]/website  Body: { deckNo: number }
// Changes the Library number of a project that has one. Numbers are unique.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const deny = await requireEditor()
  if (deny) return deny
  const { id } = await params
  const body = await request.json().catch(() => null) as { deckNo?: unknown } | null
  const next = body?.deckNo
  if (!(typeof next === 'number' && Number.isInteger(next) && next >= 1 && next <= 999)) {
    return NextResponse.json({ error: 'Send deckNo: a whole number from 1 to 999' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data: current } = await supabase.from('projects').select('*').eq('id', id).single()
  if (!current) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  const project = current as ProjectRow
  const previous = project.deck_no ?? null
  if (previous == null) {
    return NextResponse.json({ error: 'This project has no Library number yet: set its status to Public or Private to assign one' }, { status: 409 })
  }
  if (previous === next) return NextResponse.json(rowToProject(project))

  const { data: holder } = await supabase
    .from('projects')
    .select('id, full_name')
    .eq('deck_no', next)
    .neq('id', id)
    .maybeSingle()
  if (holder) {
    return NextResponse.json({ error: `Library ${String(next).padStart(3, '0')} is already used by ${holder.full_name}` }, { status: 409 })
  }

  const { error: logError } = await supabase.from('consolidation_log').insert({
    batch: `app-website-${new Date().toISOString().slice(0, 10)}`,
    project_id: id, table_name: 'projects', record_id: id, field: 'deck_no',
    old_value: previous, new_value: next, source: 'manual', note: 'Archive app: Library number changed',
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
