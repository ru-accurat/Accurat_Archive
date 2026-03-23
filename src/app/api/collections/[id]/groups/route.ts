import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

// GET /api/collections/[id]/groups — list groups for a collection
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('collection_groups')
    .select('*')
    .eq('collection_id', id)
    .order('sort_order')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data || [])
}

// POST /api/collections/[id]/groups — create a new group
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceClient()
  const body = await request.json()

  // Get max sort_order
  const { data: existing } = await supabase
    .from('collection_groups')
    .select('sort_order')
    .eq('collection_id', id)
    .order('sort_order', { ascending: false })
    .limit(1)

  const nextOrder = (existing?.[0]?.sort_order ?? -1) + 1

  const { data, error } = await supabase
    .from('collection_groups')
    .insert({
      collection_id: id,
      name: body.name || 'Untitled Group',
      sort_order: nextOrder,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// PATCH /api/collections/[id]/groups — reorder groups
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceClient()
  const body = await request.json()

  // body.order = [groupId1, groupId2, ...] in desired order
  const order: string[] = body.order
  if (!order?.length) {
    return NextResponse.json({ error: 'order array required' }, { status: 400 })
  }

  const errors: string[] = []
  for (let i = 0; i < order.length; i++) {
    const { error } = await supabase
      .from('collection_groups')
      .update({ sort_order: i })
      .eq('id', order[i])
      .eq('collection_id', id)
    if (error) errors.push(error.message)
  }

  if (errors.length) {
    return NextResponse.json({ error: errors.join('; ') }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
