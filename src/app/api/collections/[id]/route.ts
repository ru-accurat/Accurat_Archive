import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { rowToProject } from '@/lib/db-utils'
import type { ProjectRow } from '@/lib/db-utils'

// GET /api/collections/[id] — collection with full project data
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceClient()

  const { data: collection, error } = await supabase
    .from('collections')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !collection) {
    return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
  }

  // Get groups
  const { data: groups } = await supabase
    .from('collection_groups')
    .select('*')
    .eq('collection_id', id)
    .order('sort_order')

  const { data: items } = await supabase
    .from('collection_items')
    .select('project_id, position, group_id')
    .eq('collection_id', id)
    .order('position')

  const projectIds = (items || []).map((i) => i.project_id)

  let projects: ReturnType<typeof rowToProject>[] = []
  if (projectIds.length > 0) {
    const { data: rows } = await supabase
      .from('projects')
      .select('*')
      .in('id', projectIds)

    if (rows) {
      const projectMap = new Map(rows.map((r) => [r.id, rowToProject(r as ProjectRow)]))
      projects = projectIds.map((id) => projectMap.get(id)!).filter(Boolean)
    }
  }

  // Build item-to-group map
  const itemGroupMap: Record<string, string | null> = {}
  for (const item of items || []) {
    itemGroupMap[item.project_id] = item.group_id
  }

  return NextResponse.json({
    id: collection.id,
    name: collection.name,
    description: collection.description,
    isPublic: collection.is_public,
    shareToken: collection.share_token,
    projects,
    groups: (groups || []).map(g => ({
      id: g.id,
      name: g.name,
      sortOrder: g.sort_order,
    })),
    itemGroups: itemGroupMap,
  })
}

// PATCH /api/collections/[id]
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceClient()
  const body = await request.json()

  const update: Record<string, unknown> = {}
  if (body.name !== undefined) update.name = body.name
  if (body.description !== undefined) update.description = body.description

  const { error } = await supabase
    .from('collections')
    .update(update)
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

// DELETE /api/collections/[id]
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceClient()

  const { error } = await supabase.from('collections').delete().eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
