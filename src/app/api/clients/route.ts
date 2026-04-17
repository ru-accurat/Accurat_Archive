import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { requireBusinessAccess } from '@/lib/api-auth'

export async function GET() {
  const deny = await requireBusinessAccess()
  if (deny) return deny
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

  // Get project counts per client — includes both primary (client_id) and
  // secondary (client_id_2) assignments so Client 2 projects still show up
  // under that client in the Clients tab. Budget/revenue is NOT affected —
  // engagements only reference the primary client_id.
  const { data: projStats } = await supabase
    .from('projects')
    .select('client_id, client_id_2')

  const projCounts = new Map<string, number>()
  for (const p of (projStats || []) as { client_id: string | null; client_id_2: string | null }[]) {
    if (p.client_id) projCounts.set(p.client_id, (projCounts.get(p.client_id) || 0) + 1)
    if (p.client_id_2) projCounts.set(p.client_id_2, (projCounts.get(p.client_id_2) || 0) + 1)
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

  return NextResponse.json(results, {
    headers: {
      'Cache-Control': 'private, max-age=60, stale-while-revalidate=600',
    },
  })
}
