import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { rowToProject } from '@/lib/db-utils'
import type { ProjectRow } from '@/lib/db-utils'

// GET /api/public/collection/[token]/project/[projectId]
// Returns project data only if it belongs to the shared collection
export async function GET(_req: Request, { params }: { params: Promise<{ token: string; projectId: string }> }) {
  const { token, projectId } = await params
  const supabase = createServiceClient()

  // Verify collection exists and token is valid
  const { data: collection, error: collErr } = await supabase
    .from('collections')
    .select('id')
    .eq('share_token', token)
    .single()

  if (collErr || !collection) {
    return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
  }

  // Verify project belongs to this collection
  const { data: item } = await supabase
    .from('collection_items')
    .select('project_id')
    .eq('collection_id', collection.id)
    .eq('project_id', projectId)
    .single()

  if (!item) {
    return NextResponse.json({ error: 'Project not in this collection' }, { status: 404 })
  }

  // Get the project
  const { data: row, error: projErr } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single()

  if (projErr || !row) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  const project = rowToProject(row as ProjectRow)

  // Get media
  const { data: mediaFiles } = await supabase
    .storage
    .from('project-media')
    .list(project.folderName)

  const media = (mediaFiles || [])
    .filter(f => !f.name.startsWith('.') && f.name !== '.emptyFolderPlaceholder')
    .map(f => ({
      filename: f.name,
      url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/project-media/${project.folderName}/${f.name}`,
    }))

  // Sort by mediaOrder if available
  const ordered = project.mediaOrder?.length
    ? project.mediaOrder.map(name => media.find(m => m.filename === name)).filter(Boolean)
    : media

  return NextResponse.json({
    project,
    media: ordered,
  })
}
