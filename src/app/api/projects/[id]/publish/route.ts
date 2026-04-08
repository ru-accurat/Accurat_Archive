import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { logActivity } from '@/lib/activity'

// POST /api/projects/[id]/publish — set status=public
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('projects')
    .update({ status: 'public' })
    .eq('id', id)
    .select('id, full_name, status')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: error?.message || 'Project not found' }, { status: 500 })
  }

  await logActivity('project.updated', { field: 'status', value: 'public' }, id)

  return NextResponse.json({ ok: true, id: data.id, status: data.status })
}
