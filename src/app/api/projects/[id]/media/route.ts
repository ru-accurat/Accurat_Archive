import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { MEDIA_EXTS, getMediaType } from '@/lib/media-types'
import type { MediaFile } from '@/lib/types'
import { requireEditor } from '@/lib/api-auth'
import { PROJECT_MEDIA_COLUMNS, ROLE_ORDER, promoteBlockReason, type ProjectMediaRow } from '@/lib/project-media'

// GET /api/projects/[id]/media — list media files
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceClient()

  const { data: project } = await supabase
    .from('projects')
    .select('folder_name')
    .eq('id', id)
    .single()

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  const { data: files, error } = await supabase.storage
    .from('project-media')
    .list(project.folder_name, { sortBy: { column: 'name', order: 'asc' } })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Role, caption and order come from project_media (one row per file, keyed by bucket + path)
  const { data: rows } = await supabase
    .from('project_media')
    .select(PROJECT_MEDIA_COLUMNS)
    .eq('project_id', id)
    .eq('bucket', 'project-media')
  const byPath = new Map<string, ProjectMediaRow>()
  for (const r of (rows || []) as ProjectMediaRow[]) byPath.set(r.path, r)

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const mediaFiles: MediaFile[] = (files || [])
    .filter(f => {
      const ext = '.' + f.name.split('.').pop()?.toLowerCase()
      return MEDIA_EXTS.has(ext)
    })
    .map(f => {
      const row = byPath.get(`${project.folder_name}/${f.name}`)
      const file: MediaFile = {
        filename: f.name,
        path: `${supabaseUrl}/storage/v1/object/public/project-media/${encodeURIComponent(project.folder_name)}/${encodeURIComponent(f.name)}`,
        type: getMediaType(f.name),
        size: (f.metadata as Record<string, unknown>)?.size as number | undefined ?? undefined,
      }
      if (row) {
        Object.assign(file, {
          mediaId: row.id,
          role: row.role,
          source: row.source,
          position: row.position,
          caption: row.caption || '',
          isHero: row.is_hero,
          isThumbnail: row.is_thumbnail,
          width: row.width,
          height: row.height,
          duration: row.duration != null ? Number(row.duration) : null,
          deckSlide: row.deck_slide,
          flags: row.flags || [],
          hasWebCopy: !!row.web_path,
          playback: row.playback,
          promoteBlock: row.role === 'backup' ? promoteBlockReason(row) : null,
        } satisfies Partial<MediaFile>)
      }
      return file
    })

  // With roles: selected, then backup, then in-use, each by position. Files without a row go last.
  if (byPath.size > 0) {
    mediaFiles.sort((a, b) => {
      const ra = a.role ? ROLE_ORDER[a.role] : 9
      const rb = b.role ? ROLE_ORDER[b.role] : 9
      if (ra !== rb) return ra - rb
      return (a.position ?? Number.MAX_SAFE_INTEGER) - (b.position ?? Number.MAX_SAFE_INTEGER) || a.filename.localeCompare(b.filename)
    })
  }

  return NextResponse.json(mediaFiles)
}

// POST /api/projects/[id]/media — upload media files (small files only, <4MB)
// For large files, use /api/projects/[id]/media/upload-urls for direct upload
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const deny = await requireEditor()
  if (deny) return deny
  const { id } = await params
  const supabase = createServiceClient()

  const { data: project } = await supabase
    .from('projects')
    .select('folder_name')
    .eq('id', id)
    .single()

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  const formData = await request.formData()
  const files = formData.getAll('files')

  let uploaded = 0
  for (const file of files) {
    if (!(file instanceof File)) continue
    const buffer = Buffer.from(await file.arrayBuffer())
    const storagePath = `${project.folder_name}/${file.name}`

    const { error } = await supabase.storage
      .from('project-media')
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: true,
      })

    if (!error) uploaded++
  }

  // Update media_order in DB to include new files
  if (uploaded > 0) {
    const { data: allFiles } = await supabase.storage
      .from('project-media')
      .list(project.folder_name, { sortBy: { column: 'name', order: 'asc' } })

    if (allFiles) {
      const mediaOrder = allFiles
        .filter(f => {
          const ext = '.' + f.name.split('.').pop()?.toLowerCase()
          return MEDIA_EXTS.has(ext)
        })
        .map(f => f.name)

      await supabase
        .from('projects')
        .update({ media_order: mediaOrder })
        .eq('id', id)
    }
  }

  return NextResponse.json({ success: true, uploaded })
}
