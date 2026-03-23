import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

// POST /api/collections/[id]/items — add projects to collection
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceClient()
  const body = await request.json()

  const projectIds: string[] = body.projectIds || (body.projectId ? [body.projectId] : [])

  if (projectIds.length === 0) {
    return NextResponse.json({ error: 'No project IDs provided' }, { status: 400 })
  }

  // Get current max position
  const { data: existing } = await supabase
    .from('collection_items')
    .select('position')
    .eq('collection_id', id)
    .order('position', { ascending: false })
    .limit(1)

  let nextPos = (existing?.[0]?.position ?? -1) + 1

  const groupId = body.groupId || null

  const items = projectIds.map((pid) => ({
    collection_id: id,
    project_id: pid,
    position: nextPos++,
    group_id: groupId,
  }))

  const { error } = await supabase
    .from('collection_items')
    .upsert(items, { onConflict: 'collection_id,project_id' })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, added: projectIds.length })
}

// PATCH /api/collections/[id]/items — move items to a group
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceClient()
  const body = await request.json()

  const { projectIds, groupId } = body
  if (!projectIds?.length) {
    return NextResponse.json({ error: 'projectIds required' }, { status: 400 })
  }

  // Update group_id for all specified items
  let query = supabase
    .from('collection_items')
    .update({ group_id: groupId || null })
    .eq('collection_id', id)
    .in('project_id', projectIds)

  const { error } = await query
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

// DELETE /api/collections/[id]/items — remove project from collection
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceClient()
  const body = await request.json()

  const { error } = await supabase
    .from('collection_items')
    .delete()
    .eq('collection_id', id)
    .eq('project_id', body.projectId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
