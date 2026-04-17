import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { requireEditor } from '@/lib/api-auth'

// GET /api/projects/[id]/engagements — get engagements linked to this project
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServiceClient()

  // Get linked engagement IDs
  const { data: links } = await supabase
    .from('engagement_projects')
    .select('engagement_id')
    .eq('project_id', id)

  if (!links || links.length === 0) {
    return NextResponse.json([])
  }

  const engagementIds = links.map(l => l.engagement_id)

  // Get engagement details with client name
  const { data: engagements } = await supabase
    .from('engagements')
    .select('*, clients!inner(name)')
    .in('id', engagementIds)
    .order('year', { ascending: false })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const results = (engagements || []).map((e: any) => ({
    id: e.id,
    year: e.year,
    projectName: e.project_name,
    clientId: e.client_id,
    clientName: e.clients?.name || '',
    amountEur: e.amount_eur != null ? Number(e.amount_eur) : null,
    amountUsd: e.amount_usd != null ? Number(e.amount_usd) : null,
    notes: e.notes || '',
  }))

  return NextResponse.json(results)
}

// POST /api/projects/[id]/engagements — link engagements to this project
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const deny = await requireEditor()
  if (deny) return deny
  const { id } = await params
  const supabase = createServiceClient()
  const { engagementIds } = await request.json()

  if (!Array.isArray(engagementIds) || engagementIds.length === 0) {
    return NextResponse.json({ error: 'engagementIds required' }, { status: 400 })
  }

  const rows = engagementIds.map((eid: string) => ({
    engagement_id: eid,
    project_id: id,
  }))

  const { error } = await supabase
    .from('engagement_projects')
    .upsert(rows, { onConflict: 'engagement_id,project_id' })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, linked: rows.length })
}

// DELETE /api/projects/[id]/engagements — unlink an engagement from this project
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const deny = await requireEditor()
  if (deny) return deny
  const { id } = await params
  const supabase = createServiceClient()
  const { engagementId } = await request.json()

  await supabase
    .from('engagement_projects')
    .delete()
    .eq('engagement_id', engagementId)
    .eq('project_id', id)

  return NextResponse.json({ success: true })
}
