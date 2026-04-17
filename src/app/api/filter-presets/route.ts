import { NextResponse } from 'next/server'
import { createAuthServerClient } from '@/lib/supabase-server'
import { requireEditor } from '@/lib/api-auth'

// GET /api/filter-presets — list current user's presets
export async function GET() {
  const supabase = await createAuthServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('filter_presets')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Map to camelCase for the frontend
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const presets = (data || []).map((row: any) => ({
    id: row.id,
    name: row.name,
    filters: row.filters,
    sortField: row.sort_field,
    sortDirection: row.sort_direction,
    viewMode: row.view_mode,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))

  return NextResponse.json(presets)
}

// POST /api/filter-presets — create a new preset for the current user
export async function POST(request: Request) {
  const deny = await requireEditor()
  if (deny) return deny
  const supabase = await createAuthServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  if (!body.name || typeof body.name !== 'string') {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }
  if (!body.filters || typeof body.filters !== 'object') {
    return NextResponse.json({ error: 'filters is required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('filter_presets')
    .insert({
      user_id: user.id,
      name: body.name,
      filters: body.filters,
      sort_field: body.sortField || null,
      sort_direction: body.sortDirection || null,
      view_mode: body.viewMode || null,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    id: data.id,
    name: data.name,
    filters: data.filters,
    sortField: data.sort_field,
    sortDirection: data.sort_direction,
    viewMode: data.view_mode,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  })
}
