import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { requireEditor } from '@/lib/api-auth'

// POST /api/projects/[id]/media/batch-delete
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const deny = await requireEditor()
  if (deny) return deny
  const { id } = await params
  const { filenames } = await request.json() as { filenames: string[] }

  if (!Array.isArray(filenames) || filenames.length === 0) {
    return NextResponse.json({ error: 'No filenames provided' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { data: project } = await supabase
    .from('projects')
    .select('folder_name, media_order, hero_image, thumb_image')
    .eq('id', id)
    .single()

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  // Delete files from storage
  const paths = filenames.map(f => `${project.folder_name}/${f}`)
  const { error } = await supabase.storage.from('project-media').remove(paths)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Update DB
  const deleteSet = new Set(filenames)
  const updates: Record<string, unknown> = {}

  if (Array.isArray(project.media_order)) {
    updates.media_order = project.media_order.filter((f: string) => !deleteSet.has(f))
  }
  if (project.hero_image && deleteSet.has(project.hero_image)) {
    updates.hero_image = null
  }
  if (project.thumb_image && deleteSet.has(project.thumb_image)) {
    updates.thumb_image = null
  }

  if (Object.keys(updates).length > 0) {
    await supabase.from('projects').update(updates).eq('id', id)
  }

  return NextResponse.json({ success: true, deleted: filenames.length })
}
