import { createServiceClient } from '@/lib/supabase'
import type { Engagement, Client } from '@/lib/types'
import { EngagementsPageClient } from './client'

export const dynamic = 'force-dynamic'

async function fetchEngagementsAndClients(): Promise<{ engagements: Engagement[]; clients: Client[] }> {
  const supabase = createServiceClient()

  // Parallelize the main queries
  const [engagementsRes, clientsRes, engStatsRes, projStatsRes] = await Promise.all([
    supabase
      .from('engagements')
      .select('*, clients!inner(name)')
      .order('year', { ascending: false })
      .order('amount_eur', { ascending: false, nullsFirst: false })
      .range(0, 499),
    supabase.from('clients').select('*').order('name'),
    supabase.from('engagements').select('client_id, amount_eur'),
    supabase.from('projects').select('client_id').not('client_id', 'is', null),
  ])

  const engagementRows = engagementsRes.data || []
  const clientRows = clientsRes.data || []

  // Get linked project counts
  const engagementIds = engagementRows.map((e: Record<string, unknown>) => e.id as string)
  let links: { engagement_id: string }[] = []
  if (engagementIds.length > 0) {
    const { data: linksData } = await supabase
      .from('engagement_projects')
      .select('engagement_id')
      .in('engagement_id', engagementIds)
    links = (linksData || []) as { engagement_id: string }[]
  }

  const linkCounts = new Map<string, number>()
  for (const link of links) {
    linkCounts.set(link.engagement_id, (linkCounts.get(link.engagement_id) || 0) + 1)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const engagements: Engagement[] = engagementRows.map((row: any) => ({
    id: row.id,
    year: row.year,
    projectName: row.project_name,
    clientId: row.client_id,
    clientName: row.clients?.name || '',
    originalClientName: row.original_client_name,
    amountEur: row.amount_eur != null ? Number(row.amount_eur) : null,
    amountUsd: row.amount_usd != null ? Number(row.amount_usd) : null,
    importBatchId: row.import_batch_id,
    notes: row.notes || '',
    linkedProjectCount: linkCounts.get(row.id as string) || 0,
  }))

  // Build client summary data
  const engCounts = new Map<string, { count: number; revenue: number }>()
  for (const e of (engStatsRes.data || []) as { client_id: string; amount_eur: number | null }[]) {
    const existing = engCounts.get(e.client_id) || { count: 0, revenue: 0 }
    existing.count++
    if (e.amount_eur) existing.revenue += Number(e.amount_eur)
    engCounts.set(e.client_id, existing)
  }

  const projCounts = new Map<string, number>()
  for (const p of (projStatsRes.data || []) as { client_id: string }[]) {
    projCounts.set(p.client_id, (projCounts.get(p.client_id) || 0) + 1)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clients: Client[] = clientRows.map((c: any) => {
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

  return { engagements, clients }
}

export default async function EngagementsPage() {
  const { engagements, clients } = await fetchEngagementsAndClients()
  return <EngagementsPageClient initialEngagements={engagements} initialClients={clients} />
}
