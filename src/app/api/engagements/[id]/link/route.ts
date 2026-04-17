import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { requireBusinessAccess } from '@/lib/api-auth'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const deny = await requireBusinessAccess()
  if (deny) return deny
  const { id } = await params
  const supabase = createServiceClient()
  const { projectIds } = await request.json()

  if (!Array.isArray(projectIds) || projectIds.length === 0) {
    return NextResponse.json({ error: 'projectIds required' }, { status: 400 })
  }

  const rows = projectIds.map((pid: string) => ({
    engagement_id: id,
    project_id: pid,
  }))

  const { error } = await supabase
    .from('engagement_projects')
    .upsert(rows, { onConflict: 'engagement_id,project_id' })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, linked: rows.length })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const deny = await requireBusinessAccess()
  if (deny) return deny
  const { id } = await params
  const supabase = createServiceClient()
  const { projectIds } = await request.json()

  if (!Array.isArray(projectIds) || projectIds.length === 0) {
    return NextResponse.json({ error: 'projectIds required' }, { status: 400 })
  }

  for (const pid of projectIds) {
    await supabase
      .from('engagement_projects')
      .delete()
      .eq('engagement_id', id)
      .eq('project_id', pid)
  }

  return NextResponse.json({ success: true, unlinked: projectIds.length })
}
