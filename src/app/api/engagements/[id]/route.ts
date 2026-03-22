import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServiceClient()
  const body = await request.json()

  const update: Record<string, unknown> = {}
  if (body.projectName !== undefined) update.project_name = body.projectName
  if (body.amountEur !== undefined) update.amount_eur = body.amountEur
  if (body.amountUsd !== undefined) update.amount_usd = body.amountUsd
  if (body.notes !== undefined) update.notes = body.notes
  if (body.year !== undefined) update.year = body.year

  // Handle client change — could be an ID or a new name
  if (body.clientId) {
    update.client_id = body.clientId
  } else if (body.clientName) {
    // Find or create client by name
    const { data: existing } = await supabase
      .from('clients')
      .select('id')
      .eq('name', body.clientName)
      .single()

    if (existing) {
      update.client_id = existing.id
    } else {
      const { data: newClient } = await supabase
        .from('clients')
        .insert({ name: body.clientName })
        .select('id')
        .single()
      if (newClient) update.client_id = newClient.id
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const { error } = await supabase.from('engagements').update(update).eq('id', id)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServiceClient()
  const { error } = await supabase.from('engagements').delete().eq('id', id)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
