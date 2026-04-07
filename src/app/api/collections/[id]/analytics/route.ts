import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

// GET /api/collections/[id]/analytics — aggregate stats for a collection
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceClient()

  const { data: views, error } = await supabase
    .from('collection_views')
    .select('project_id, visitor_id, viewed_at')
    .eq('collection_id', id)
    .order('viewed_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const rows = views || []
  const totalViews = rows.length
  const uniqueVisitors = new Set(rows.map((r) => r.visitor_id).filter(Boolean)).size
  const lastViewedAt = rows[0]?.viewed_at || null

  // Top viewed projects
  const projectCounts: Record<string, number> = {}
  for (const r of rows) {
    if (r.project_id) {
      projectCounts[r.project_id] = (projectCounts[r.project_id] || 0) + 1
    }
  }
  const topProjectIds = Object.entries(projectCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  let topProjects: { id: string; client: string; projectName: string; views: number }[] = []
  if (topProjectIds.length) {
    const ids = topProjectIds.map(([id]) => id)
    const { data: projectRows } = await supabase
      .from('projects')
      .select('id, client, project_name')
      .in('id', ids)
    const map = new Map((projectRows || []).map((p) => [p.id, p]))
    topProjects = topProjectIds.map(([pid, count]) => {
      const p = map.get(pid)
      return {
        id: pid,
        client: p?.client || '',
        projectName: p?.project_name || '',
        views: count,
      }
    })
  }

  return NextResponse.json({
    totalViews,
    uniqueVisitors,
    lastViewedAt,
    topProjects,
  })
}
