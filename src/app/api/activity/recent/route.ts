import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

// GET /api/activity/recent — last 10 activity entries joined with project info
export async function GET() {
  const supabase = createServiceClient()

  const { data: activities, error } = await supabase
    .from('activity_log')
    .select('id, action, project_id, details, created_at')
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const rows = activities || []
  const projectIds = Array.from(
    new Set(rows.map((r) => r.project_id).filter((id): id is string => !!id))
  )

  let projectsById: Record<string, { id: string; client: string; project_name: string; full_name: string }> = {}
  if (projectIds.length > 0) {
    const { data: projects } = await supabase
      .from('projects')
      .select('id, client, project_name, full_name')
      .in('id', projectIds)
    if (projects) {
      projectsById = Object.fromEntries(projects.map((p) => [p.id, p]))
    }
  }

  const entries = rows.map((r) => {
    const project = r.project_id ? projectsById[r.project_id] : null
    const details = (r.details as Record<string, unknown> | null) || {}
    const fallbackName =
      typeof details.projectName === 'string' ? (details.projectName as string) : null
    return {
      id: r.id,
      action: r.action as string,
      createdAt: r.created_at as string,
      projectId: r.project_id as string | null,
      projectName: project ? project.full_name : fallbackName,
      client: project?.client ?? null,
      details,
    }
  })

  return NextResponse.json(entries, {
    headers: {
      'Cache-Control': 'private, max-age=60, stale-while-revalidate=300',
    },
  })
}
