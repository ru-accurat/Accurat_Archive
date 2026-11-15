import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { requireEditor } from '@/lib/api-auth'
import { logActivity } from '@/lib/activity'
import { PROJECT_MEDIA_COLUMNS, ROLE_ORDER, baseName, promoteBlockReason, type ProjectMediaRow } from '@/lib/project-media'

type TargetRole = 'selected' | 'backup'

// POST /api/projects/[id]/media/role: move files between selected and backup in one batch.
// Body: { ids: string[] (project_media ids), role: 'selected' | 'backup' }
//
// All or nothing: if any file can't move, nothing changes and the reasons come back.
// Promoted files go to the end of Selected; demoted files go to the top of Backup.
// Positions are renumbered (selected, backup, in-use), media_order is kept in sync with
// in-use files left in their slots, and every change is written to consolidation_log.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const deny = await requireEditor()
  if (deny) return deny
  const { id } = await params
  const body = await request.json().catch(() => null) as { ids?: unknown; role?: unknown } | null
  const role = body?.role as TargetRole
  const ids = Array.isArray(body?.ids) ? [...new Set(body!.ids.filter((x): x is string => typeof x === 'string'))] : []
  if ((role !== 'selected' && role !== 'backup') || ids.length === 0) {
    return NextResponse.json({ error: 'Send ids (non-empty) and role (selected or backup)' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single()
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const { data: rowsData, error: rowsError } = await supabase
    .from('project_media')
    .select(PROJECT_MEDIA_COLUMNS)
    .eq('project_id', id)
    .eq('bucket', 'project-media')
  if (rowsError) return NextResponse.json({ error: rowsError.message }, { status: 500 })
  const rows = (rowsData || []) as ProjectMediaRow[]
  const byId = new Map(rows.map((r) => [r.id, r]))

  // Validate every requested file before writing anything
  const problems: { id: string; filename: string; reason: string }[] = []
  const moving: ProjectMediaRow[] = []
  for (const mid of ids) {
    const row = byId.get(mid)
    if (!row) { problems.push({ id: mid, filename: mid, reason: 'Not a media file of this project' }); continue }
    const filename = baseName(row.path)
    if (row.role === role) continue
    if (row.role === 'inuse') { problems.push({ id: mid, filename, reason: 'In-use mockups stay in-use' }); continue }
    if (role === 'selected') {
      const reason = promoteBlockReason(row)
      if (reason) { problems.push({ id: mid, filename, reason }); continue }
    } else {
      if (row.is_hero || filename === project.hero_image) { problems.push({ id: mid, filename, reason: 'It is the hero image; choose another hero first' }); continue }
      if (row.is_thumbnail || filename === project.thumb_image) { problems.push({ id: mid, filename, reason: 'It is the thumbnail; choose another thumbnail first' }); continue }
    }
    moving.push(row)
  }
  if (problems.length > 0) {
    return NextResponse.json({ error: 'Some files cannot move', problems }, { status: 409 })
  }
  if (moving.length === 0) return NextResponse.json({ success: true, changed: 0 })

  // New order: selected (kept, then promoted), backup (demoted, then kept), in-use (unchanged)
  const movingIds = new Set(moving.map((r) => r.id))
  const byPos = (a: ProjectMediaRow, b: ProjectMediaRow) =>
    (a.position ?? Number.MAX_SAFE_INTEGER) - (b.position ?? Number.MAX_SAFE_INTEGER) || a.path.localeCompare(b.path)
  const sorted = [...rows].sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role] || byPos(a, b))
  const stay = (r: ProjectMediaRow) => !movingIds.has(r.id)
  const selected = role === 'selected'
    ? [...sorted.filter((r) => r.role === 'selected'), ...sorted.filter((r) => movingIds.has(r.id))]
    : sorted.filter((r) => r.role === 'selected' && stay(r))
  const backup = role === 'backup'
    ? [...sorted.filter((r) => movingIds.has(r.id)), ...sorted.filter((r) => r.role === 'backup')]
    : sorted.filter((r) => r.role === 'backup' && stay(r))
  const inuse = sorted.filter((r) => r.role === 'inuse')

  const next = [
    ...selected.map((r) => ({ row: r, role: 'selected' as const })),
    ...backup.map((r) => ({ row: r, role: 'backup' as const })),
    ...inuse.map((r) => ({ row: r, role: 'inuse' as const })),
  ].map((x, i) => ({ ...x, position: i + 1 }))

  const changes = next.filter((x) => x.role !== x.row.role || x.position !== x.row.position)
  const batch = `app-media-role-${new Date().toISOString().slice(0, 10)}`
  const logRows = changes.flatMap((x) => {
    const out = []
    if (x.role !== x.row.role) out.push({ field: 'role', old_value: x.row.role, new_value: x.role })
    if (x.position !== x.row.position) out.push({ field: 'position', old_value: x.row.position, new_value: x.position })
    return out.map((o) => ({ batch, project_id: id, table_name: 'project_media', record_id: x.row.id, source: 'manual', note: `Archive app: ${role === 'selected' ? 'made selected' : 'moved to backup'}`, ...o }))
  })

  // media_order: the non-in-use files with a row take their new order; every other slot stays put
  const ordered = [...selected, ...backup].map((r) => baseName(r.path))
  const orderedSet = new Set(ordered)
  const currentOrder: string[] = project.media_order || []
  const queue = [...ordered]
  const newOrder = currentOrder.map((name) => (orderedSet.has(name) ? queue.shift()! : name))
  const placed = new Set(newOrder)
  for (const name of queue) if (!placed.has(name)) newOrder.push(name)

  await supabase.from('project_history').insert({ project_id: id, snapshot: project })
  if (logRows.length > 0) {
    const { error } = await supabase.from('consolidation_log').insert(logRows)
    if (error) return NextResponse.json({ error: `Log failed, nothing changed: ${error.message}` }, { status: 500 })
  }
  for (const x of changes) {
    const { error } = await supabase
      .from('project_media')
      .update({ role: x.role, position: x.position })
      .eq('id', x.row.id)
    if (error) return NextResponse.json({ error: `Failed on ${baseName(x.row.path)}: ${error.message}` }, { status: 500 })
  }
  if (JSON.stringify(newOrder) !== JSON.stringify(currentOrder)) {
    await supabase.from('projects').update({ media_order: newOrder }).eq('id', id)
  }

  await logActivity('media.role_changed', {
    projectName: project.full_name,
    role,
    count: moving.length,
    files: moving.map((r) => baseName(r.path)),
  }, id)

  return NextResponse.json({ success: true, changed: moving.length })
}
