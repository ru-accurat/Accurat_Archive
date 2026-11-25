import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { requireEditor } from '@/lib/api-auth'
import { checkMediaDelete } from '@/lib/media-register'

// DELETE /api/projects/[id]/media/[filename]
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; filename: string }> }
) {
  const deny = await requireEditor()
  if (deny) return deny
  const { id, filename } = await params
  const supabase = createServiceClient()

  const { data: project } = await supabase
    .from('projects')
    .select('folder_name')
    .eq('id', id)
    .single()

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  const decodedFilename = decodeURIComponent(filename)
  const { blocked, rowIds } = await checkMediaDelete(supabase, id, project.folder_name, [decodedFilename])
  if (blocked.length > 0) {
    return NextResponse.json({ error: 'This file is Selected and shown on the website. Move it to Backup first.' }, { status: 409 })
  }
  const storagePath = `${project.folder_name}/${decodedFilename}`
  const { error } = await supabase.storage.from('project-media').remove([storagePath])

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (rowIds.length > 0) await supabase.from('project_media').delete().in('id', rowIds)

  // Update media_order to remove the deleted file
  const { data: proj } = await supabase
    .from('projects')
    .select('media_order, hero_image, thumb_image')
    .eq('id', id)
    .single()

  if (proj) {
    const updates: Record<string, unknown> = {}
    if (Array.isArray(proj.media_order)) {
      updates.media_order = proj.media_order.filter((f: string) => f !== decodedFilename)
    }
    if (proj.hero_image === decodedFilename) updates.hero_image = null
    if (proj.thumb_image === decodedFilename) updates.thumb_image = null

    if (Object.keys(updates).length > 0) {
      await supabase.from('projects').update(updates).eq('id', id)
    }
  }

  return NextResponse.json({ success: true })
}
