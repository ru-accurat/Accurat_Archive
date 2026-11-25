import 'server-only'
import crypto from 'node:crypto'
import sharp from 'sharp'
import type { SupabaseClient } from '@supabase/supabase-js'
import { MEDIA_EXTS, getMediaType } from './media-types'

const BUCKET = 'project-media'
// Images are downloaded to read their size and fingerprint; larger ones are registered without them.
const MAX_IMAGE_BYTES = 60 * 1024 * 1024

/** File names in the project folder that project_media tracks (these must never be renamed or replaced). */
export async function trackedNames(supabase: SupabaseClient, projectId: string, folder: string): Promise<Set<string>> {
  const { data } = await supabase
    .from('project_media')
    .select('path')
    .eq('project_id', projectId)
    .eq('bucket', BUCKET)
  const prefix = `${folder}/`
  return new Set((data || []).map((r) => r.path as string).filter((p) => p.startsWith(prefix)).map((p) => p.slice(prefix.length)))
}

/**
 * Checks a delete from the gallery. Selected files are refused (the website shows them: move them to
 * Backup first). For the others, returns the project_media row ids to remove with the files, so no
 * row is left pointing at a missing file.
 */
export async function checkMediaDelete(
  supabase: SupabaseClient,
  projectId: string,
  folder: string,
  names: string[]
): Promise<{ blocked: string[]; rowIds: string[] }> {
  const paths = names.map((n) => `${folder}/${n}`)
  const { data } = await supabase
    .from('project_media')
    .select('id, path, role')
    .eq('project_id', projectId)
    .eq('bucket', BUCKET)
    .in('path', paths)
  const rows = (data || []) as { id: string; path: string; role: string }[]
  return {
    blocked: rows.filter((r) => r.role === 'selected').map((r) => r.path.slice(folder.length + 1)),
    rowIds: rows.filter((r) => r.role !== 'selected').map((r) => r.id),
  }
}

/**
 * Adds a `backup` project_media row for every media file in the folder that has none, so new uploads
 * show up in the Backup section. Images get width, height and SHA-1; videos get them from the M9 tool.
 * Returns the number of rows added.
 */
export async function registerNewMedia(
  supabase: SupabaseClient,
  projectId: string,
  folder: string,
  files: { name: string; size?: number }[]
): Promise<number> {
  const tracked = await trackedNames(supabase, projectId, folder)
  const fresh = files.filter((f) => !tracked.has(f.name) && MEDIA_EXTS.has('.' + (f.name.split('.').pop() || '').toLowerCase()))
  if (fresh.length === 0) return 0

  const { data: last } = await supabase
    .from('project_media')
    .select('position')
    .eq('project_id', projectId)
    .order('position', { ascending: false, nullsFirst: false })
    .limit(1)
  let position = (last?.[0]?.position as number | null) ?? 0

  const rows = []
  for (const f of fresh) {
    const kind = getMediaType(f.name) === 'video' ? 'video' : 'image'
    let width: number | null = null
    let height: number | null = null
    let sha1: string | null = null
    if (kind === 'image' && (f.size ?? 0) <= MAX_IMAGE_BYTES) {
      try {
        const { data: blob } = await supabase.storage.from(BUCKET).download(`${folder}/${f.name}`)
        if (blob) {
          const buf = Buffer.from(await blob.arrayBuffer())
          sha1 = crypto.createHash('sha1').update(buf).digest('hex')
          const meta = await sharp(buf).metadata()
          // EXIF orientation 5-8 means the stored pixels are rotated 90 degrees
          const rotated = (meta.orientation ?? 1) >= 5
          width = (rotated ? meta.height : meta.width) ?? null
          height = (rotated ? meta.width : meta.height) ?? null
        }
      } catch (err) {
        console.error(`register: could not read ${folder}/${f.name}`, err)
      }
    }
    position += 1
    rows.push({
      project_id: projectId,
      bucket: BUCKET,
      path: `${folder}/${f.name}`,
      kind,
      role: 'backup',
      source: 'archive',
      position,
      width,
      height,
      sha1,
    })
  }
  const { error } = await supabase.from('project_media').insert(rows)
  if (error) {
    console.error('register: insert failed', error.message)
    return 0
  }
  return rows.length
}
