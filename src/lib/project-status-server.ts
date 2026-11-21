import 'server-only'
import type { createServiceClient } from './supabase'
import type { ProjectRow } from './db-utils'
import { ON_WEBSITE, STATUS_LABELS, normalizeStatus, type ProjectStatus } from './status'

type Supabase = ReturnType<typeof createServiceClient>

export interface ReadinessCheck { key: string; label: string; ok: boolean }

type MediaFlags = { project_id: string; kind: string; is_hero: boolean; is_thumbnail: boolean }

function checksFor(project: ProjectRow, selected: MediaFlags[]): ReadinessCheck[] {
  return [
    { key: 'selected', label: 'at least one selected media file', ok: selected.length > 0 },
    { key: 'hero', label: 'a selected image set as hero', ok: selected.some((m) => m.is_hero && m.kind === 'image') },
    { key: 'thumbnail', label: 'a selected image set as thumbnail', ok: selected.some((m) => m.is_thumbnail && m.kind === 'image') },
    { key: 'category', label: 'a category', ok: project.category_id != null },
    { key: 'offerings', label: 'at least one offering', ok: (project.offerings?.length ?? 0) > 0 },
    { key: 'whatWeMade', label: '"What we made" text', ok: !!project.what_we_made?.trim() },
  ]
}

async function selectedMediaByProject(supabase: Supabase, ids: string[]) {
  const by = new Map<string, MediaFlags[]>()
  if (ids.length === 0) return by
  const { data } = await supabase
    .from('project_media')
    .select('project_id, kind, is_hero, is_thumbnail')
    .in('project_id', ids)
    .eq('bucket', 'project-media')
    .eq('role', 'selected')
  for (const m of (data || []) as MediaFlags[]) {
    by.set(m.project_id, [...(by.get(m.project_id) || []), m])
  }
  return by
}

/** What a project needs before it can go on the website. Every live project has all of it. */
export async function readinessChecks(supabase: Supabase, project: ProjectRow) {
  const media = await selectedMediaByProject(supabase, [project.id])
  return checksFor(project, media.get(project.id) || [])
}

export async function nextFreeLibraryNumber(supabase: Supabase) {
  const { data } = await supabase
    .from('projects')
    .select('deck_no')
    .not('deck_no', 'is', null)
    .order('deck_no', { ascending: false })
    .limit(1)
  return ((data?.[0]?.deck_no as number | undefined) ?? 0) + 1
}

export interface StatusChangeResult {
  changed: { id: string; status: ProjectStatus; deckNo: number | null; name: string }[]
  skipped: { id: string; name: string; reason: string }[]
  unchanged: number
}

/**
 * Sets the status of one or more projects. The rules, in one place for every caller:
 * - Moving a project onto the website (to public or private from draft or archive_only) needs
 *   every readiness check; a project without a Library number gets the next free one.
 * - Leaving the website keeps the Library number, reserved.
 * Projects that cannot change are skipped with a reason; the rest change. Every change is
 * logged to consolidation_log and snapshotted in project_history before it is written.
 */
export async function applyStatusChange(
  supabase: Supabase,
  ids: string[],
  next: ProjectStatus,
  note: string,
): Promise<StatusChangeResult> {
  const result: StatusChangeResult = { changed: [], skipped: [], unchanged: 0 }
  const unique = [...new Set(ids)]
  const { data: rows, error } = await supabase.from('projects').select('*').in('id', unique)
  if (error) throw new Error(error.message)
  const byId = new Map(((rows || []) as ProjectRow[]).map((r) => [r.id, r]))

  const plans: { row: ProjectRow; from: ProjectStatus; deckNo: number | null }[] = []
  const goingOn = unique.filter((id) => {
    const row = byId.get(id)
    return row && ON_WEBSITE.has(next) && !ON_WEBSITE.has(normalizeStatus(row.status))
  })
  const media = await selectedMediaByProject(supabase, goingOn)
  let nextFree = goingOn.length > 0 ? await nextFreeLibraryNumber(supabase) : 0

  for (const id of unique) {
    const row = byId.get(id)
    if (!row) { result.skipped.push({ id, name: id, reason: 'Project not found' }); continue }
    const from = normalizeStatus(row.status)
    if (from === next && row.status === next) { result.unchanged++; continue }
    let deckNo = row.deck_no ?? null
    if (ON_WEBSITE.has(next) && !ON_WEBSITE.has(from)) {
      const missing = checksFor(row, media.get(id) || []).filter((c) => !c.ok).map((c) => c.label)
      if (missing.length > 0) {
        result.skipped.push({ id, name: row.full_name, reason: `Not ready for the website: missing ${missing.join(', ')}` })
        continue
      }
      if (deckNo == null) deckNo = nextFree++
    }
    plans.push({ row, from, deckNo })
  }
  if (plans.length === 0) return result

  const batch = `app-status-${new Date().toISOString().slice(0, 10)}`
  const log = plans.flatMap(({ row, deckNo }) => [
    { batch, project_id: row.id, table_name: 'projects', record_id: row.id, field: 'status', old_value: row.status, new_value: next, source: 'manual', note },
    ...(deckNo !== (row.deck_no ?? null)
      ? [{ batch, project_id: row.id, table_name: 'projects', record_id: row.id, field: 'deck_no', old_value: row.deck_no ?? null, new_value: deckNo, source: 'manual', note: `${note}: next free Library number` }]
      : []),
  ])
  const { error: logError } = await supabase.from('consolidation_log').insert(log)
  if (logError) throw new Error(`Log failed, nothing changed: ${logError.message}`)
  await supabase.from('project_history').insert(plans.map(({ row }) => ({ project_id: row.id, snapshot: row })))

  for (const { row, deckNo } of plans) {
    const { error: updError } = await supabase
      .from('projects')
      .update({ status: next, deck_no: deckNo })
      .eq('id', row.id)
    if (updError) {
      result.skipped.push({
        id: row.id, name: row.full_name,
        reason: updError.code === '23505' ? 'That Library number was just taken; try again' : updError.message,
      })
      continue
    }
    result.changed.push({ id: row.id, status: next, deckNo, name: row.full_name })
  }

  if (result.changed.length > 0) {
    await supabase.from('activity_log').insert(result.changed.map((c) => ({
      action: 'project.updated',
      project_id: c.id,
      details: { projectName: c.name, fields: ['status'], value: next, label: STATUS_LABELS[next], deckNo: c.deckNo },
    })))
  }
  return result
}
