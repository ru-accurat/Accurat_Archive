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
