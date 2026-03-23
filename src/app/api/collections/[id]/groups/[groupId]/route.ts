import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

// PATCH /api/collections/[id]/groups/[groupId] — update group name or order
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; groupId: string }> }) {
  const { groupId } = await params
  const supabase = createServiceClient()
  const body = await request.json()

  const update: Record<string, unknown> = {}
  if (body.name !== undefined) update.name = body.name
  if (body.subtitle !== undefined) update.subtitle = body.subtitle
  if (body.sortOrder !== undefined) update.sort_order = body.sortOrder

  const { error } = await supabase
    .from('collection_groups')
    .update(update)
    .eq('id', groupId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

// DELETE /api/collections/[id]/groups/[groupId] — delete group (items become ungrouped)
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; groupId: string }> }) {
  const { groupId } = await params
  const supabase = createServiceClient()

  const { error } = await supabase
    .from('collection_groups')
    .delete()
    .eq('id', groupId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
