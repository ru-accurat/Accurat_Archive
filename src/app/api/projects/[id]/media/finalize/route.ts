import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { MEDIA_EXTS } from '@/lib/media-types'

// POST /api/projects/[id]/media/finalize
// Called after direct-to-Supabase uploads complete to sync media_order in DB
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServiceClient()

  const { data: project } = await supabase
    .from('projects')
    .select('folder_name, hero_image')
    .eq('id', id)
    .single()

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  const { data: allFiles } = await supabase.storage
    .from('project-media')
    .list(project.folder_name, { sortBy: { column: 'name', order: 'asc' } })

  if (!allFiles) {
    return NextResponse.json({ error: 'Failed to list files' }, { status: 500 })
  }

  const mediaOrder = allFiles
    .filter(f => {
      const ext = '.' + f.name.split('.').pop()?.toLowerCase()
      return MEDIA_EXTS.has(ext)
    })
    .map(f => f.name)

  const updates: Record<string, unknown> = { media_order: mediaOrder }

  // Set hero_image if not already set
  if (!project.hero_image && mediaOrder.length > 0) {
    updates.hero_image = mediaOrder[0]
  }

  await supabase.from('projects').update(updates).eq('id', id)

  return NextResponse.json({ success: true, mediaCount: mediaOrder.length })
}
