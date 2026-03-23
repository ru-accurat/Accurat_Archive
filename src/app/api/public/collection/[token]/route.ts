import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { rowToProject } from '@/lib/db-utils'
import type { ProjectRow } from '@/lib/db-utils'

// GET /api/public/collection/[token] — shared collection by token
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = createServiceClient()

  const { data: collection, error } = await supabase
    .from('collections')
    .select('*')
    .eq('share_token', token)
    .single()

  if (error || !collection) {
    return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
  }

  // Get groups
  const { data: groups } = await supabase
    .from('collection_groups')
    .select('*')
    .eq('collection_id', collection.id)
    .order('sort_order')

  const { data: items } = await supabase
    .from('collection_items')
    .select('project_id, position, group_id')
    .eq('collection_id', collection.id)
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
    name: collection.name,
    description: collection.description,
    projects,
    groups: (groups || []).map(g => ({
      id: g.id,
      name: g.name,
      sortOrder: g.sort_order,
    })),
    itemGroups: itemGroupMap,
  })
}
