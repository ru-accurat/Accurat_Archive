import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

// GET /api/collections
export async function GET() {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('collections')
    .select('*, collection_items(project_id)')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const collections = (data || []).map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    isPublic: c.is_public,
    shareToken: c.share_token,
    projectCount: c.collection_items?.length || 0,
    createdAt: c.created_at,
  }))

  return NextResponse.json(collections, {
    headers: {
      'Cache-Control': 'private, max-age=30, stale-while-revalidate=300',
    },
  })
}

// POST /api/collections
export async function POST(request: Request) {
  const supabase = createServiceClient()
  const body = await request.json()

  const { data, error } = await supabase
    .from('collections')
    .insert({
      name: body.name,
      description: body.description || '',
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
