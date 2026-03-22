import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServiceClient()

  const { data: client, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  }

  // Get engagements for this client
  const { data: engagements } = await supabase
    .from('engagements')
    .select('*')
    .eq('client_id', id)
    .order('year', { ascending: false })

  // Get revenue by year
  const revenueByYear: Record<number, number> = {}
  let totalRevenue = 0
  for (const e of (engagements || []) as { year: number; amount_eur: number | null }[]) {
    const eur = e.amount_eur ? Number(e.amount_eur) : 0
    revenueByYear[e.year] = (revenueByYear[e.year] || 0) + eur
    totalRevenue += eur
  }

  // Get linked projects
  const { data: projects } = await supabase
    .from('projects')
    .select('id, full_name, client, project_name, folder_name, thumb_image, hero_image, start_year, section')
    .eq('client_id', id)

  return NextResponse.json({
    id: client.id,
    name: client.name,
    aliases: client.aliases || [],
    notes: client.notes || '',
    engagementCount: engagements?.length || 0,
    projectCount: projects?.length || 0,
    totalRevenue,
    revenueByYear,
    engagements: (engagements || []).map((e: Record<string, unknown>) => ({
      id: e.id,
      year: e.year,
      projectName: e.project_name,
      amountEur: e.amount_eur != null ? Number(e.amount_eur) : null,
      amountUsd: e.amount_usd != null ? Number(e.amount_usd) : null,
      notes: e.notes || '',
    })),
    projects: (projects || []).map((p: Record<string, unknown>) => ({
      id: p.id,
      fullName: p.full_name,
      client: p.client,
      projectName: p.project_name,
      folderName: p.folder_name,
      thumbImage: p.thumb_image,
      heroImage: p.hero_image,
      start: p.start_year,
      section: p.section,
    })),
  })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServiceClient()
  const body = await request.json()

  const update: Record<string, unknown> = {}
  if (body.name !== undefined) update.name = body.name
  if (body.aliases !== undefined) update.aliases = body.aliases
  if (body.notes !== undefined) update.notes = body.notes

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const { error } = await supabase.from('clients').update(update).eq('id', id)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
