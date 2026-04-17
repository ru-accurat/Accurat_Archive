import { NextResponse } from 'next/server'
import { createAuthServerClient } from '@/lib/supabase-server'
import { requireEditor } from '@/lib/api-auth'

// PATCH /api/filter-presets/[id] — rename or update a preset (current user only)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const deny = await requireEditor()
  if (deny) return deny
  const { id } = await params
  const supabase = await createAuthServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const update: Record<string, unknown> = {}
  if (body.name !== undefined) update.name = body.name
  if (body.filters !== undefined) update.filters = body.filters
  if (body.sortField !== undefined) update.sort_field = body.sortField
  if (body.sortDirection !== undefined) update.sort_direction = body.sortDirection
  if (body.viewMode !== undefined) update.view_mode = body.viewMode

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  // RLS will block if it's not the user's preset
  const { data, error } = await supabase
    .from('filter_presets')
    .update(update)
    .eq('id', id)
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

// DELETE /api/filter-presets/[id] — remove a preset (current user only)
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const deny = await requireEditor()
  if (deny) return deny
  const { id } = await params
  const supabase = await createAuthServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { error } = await supabase
    .from('filter_presets')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
