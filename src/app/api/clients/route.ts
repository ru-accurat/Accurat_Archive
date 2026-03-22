import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function GET() {
  const supabase = createServiceClient()

  // Get all clients
  const { data: clients, error } = await supabase
    .from('clients')
    .select('*')
    .order('name')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Get engagement counts and revenue per client
  const { data: engStats } = await supabase
    .from('engagements')
    .select('client_id, amount_eur')

  const engCounts = new Map<string, { count: number; revenue: number }>()
  for (const e of (engStats || []) as { client_id: string; amount_eur: number | null }[]) {
    const existing = engCounts.get(e.client_id) || { count: 0, revenue: 0 }
    existing.count++
    if (e.amount_eur) existing.revenue += Number(e.amount_eur)
    engCounts.set(e.client_id, existing)
  }

  // Get project counts per client
  const { data: projStats } = await supabase
    .from('projects')
    .select('client_id')
    .not('client_id', 'is', null)

  const projCounts = new Map<string, number>()
  for (const p of (projStats || []) as { client_id: string }[]) {
    projCounts.set(p.client_id, (projCounts.get(p.client_id) || 0) + 1)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const results = (clients || []).map((c: any) => {
    const eng = engCounts.get(c.id) || { count: 0, revenue: 0 }
    return {
      id: c.id,
      name: c.name,
      aliases: c.aliases || [],
      notes: c.notes || '',
      engagementCount: eng.count,
      projectCount: projCounts.get(c.id) || 0,
      totalRevenue: eng.revenue,
    }
  })

  return NextResponse.json(results)
}
