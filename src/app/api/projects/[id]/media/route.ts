import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { MEDIA_EXTS, getMediaType } from '@/lib/media-types'
import type { MediaFile } from '@/lib/types'

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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const mediaFiles: MediaFile[] = (files || [])
    .filter(f => {
      const ext = '.' + f.name.split('.').pop()?.toLowerCase()
      return MEDIA_EXTS.has(ext)
    })
    .map(f => ({
      filename: f.name,
      path: `${supabaseUrl}/storage/v1/object/public/project-media/${encodeURIComponent(project.folder_name)}/${encodeURIComponent(f.name)}`,
      type: getMediaType(f.name),
    }))

  return NextResponse.json(mediaFiles)
}

// POST /api/projects/[id]/media — upload media files (small files only, <4MB)
// For large files, use /api/projects/[id]/media/upload-urls for direct upload
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
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
