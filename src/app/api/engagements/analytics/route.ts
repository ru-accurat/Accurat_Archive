import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { requireBusinessAccess } from '@/lib/api-auth'

export async function GET() {
  const deny = await requireBusinessAccess()
  if (deny) return deny
  const supabase = createServiceClient()

  // Get all engagements with client info
  const { data: engagements } = await supabase
    .from('engagements')
    .select('id, year, amount_eur, client_id, clients!inner(name)')

  // Get engagement-project links with project metadata
  const { data: links } = await supabase
    .from('engagement_projects')
    .select('engagement_id, project_id')

  const { data: projects } = await supabase
    .from('projects')
    .select('id, domains, services, section, output')

  if (!engagements) {
    return NextResponse.json({ byYear: {}, byDomain: {}, byService: {}, byUnit: {}, byOutput: {}, topClients: [], concentration: 0 })
  }

  // Build project lookup
  const projectMap = new Map<string, { domains: string[]; services: string[]; section: string; output: string }>()
  for (const p of (projects || []) as { id: string; domains: string[]; services: string[]; section: string; output: string }[]) {
    projectMap.set(p.id, p)
  }

  // Build engagement → project IDs map
  const engProjectMap = new Map<string, string[]>()
  for (const l of (links || []) as { engagement_id: string; project_id: string }[]) {
    if (!engProjectMap.has(l.engagement_id)) engProjectMap.set(l.engagement_id, [])
    engProjectMap.get(l.engagement_id)!.push(l.project_id)
  }

  // Revenue by year
  const byYear: Record<number, number> = {}
  // Revenue by domain/service/unit/output (from linked projects)
  const byDomain: Record<string, number> = {}
  const byService: Record<string, number> = {}
  const byUnit: Record<string, number> = {}
  const byOutput: Record<string, number> = {}
  // Revenue by client
  const byClient: Record<string, { name: string; revenue: number }> = {}

  let totalRevenue = 0

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const e of engagements as any[]) {
    const eur = e.amount_eur ? Number(e.amount_eur) : 0
    totalRevenue += eur

    // By year
    byYear[e.year] = (byYear[e.year] || 0) + eur

    // By client
    const clientName = e.clients?.name || 'Unknown'
    if (!byClient[e.client_id]) byClient[e.client_id] = { name: clientName, revenue: 0 }
    byClient[e.client_id].revenue += eur

    // By project metadata (only for linked engagements)
    const projectIds = engProjectMap.get(e.id) || []
    for (const pid of projectIds) {
      const proj = projectMap.get(pid)
      if (!proj) continue

      // Split revenue evenly across linked projects for this engagement
      const share = eur / projectIds.length

      for (const d of proj.domains) {
        byDomain[d] = (byDomain[d] || 0) + share
      }
      for (const s of proj.services) {
        byService[s] = (byService[s] || 0) + share
      }
      if (proj.section) {
        byUnit[proj.section] = (byUnit[proj.section] || 0) + share
      }
      if (proj.output) {
        byOutput[proj.output] = (byOutput[proj.output] || 0) + share
      }
    }
  }

  // Top clients
  const topClients = Object.values(byClient)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10)
    .map(c => ({
      name: c.name,
      revenue: Math.round(c.revenue),
      percentage: totalRevenue > 0 ? Math.round((c.revenue / totalRevenue) * 1000) / 10 : 0,
    }))

  // Concentration: top 3 clients as % of total
  const top3Revenue = topClients.slice(0, 3).reduce((s, c) => s + c.revenue, 0)
  const concentration = totalRevenue > 0 ? Math.round((top3Revenue / totalRevenue) * 1000) / 10 : 0

  // Round all values
  const round = (obj: Record<string, number>) =>
    Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, Math.round(v)]).sort((a, b) => (b[1] as number) - (a[1] as number)))

  return NextResponse.json({
    byYear,
    byDomain: round(byDomain),
    byService: round(byService),
    byUnit: round(byUnit),
    byOutput: round(byOutput),
    topClients,
    concentration,
    totalRevenue: Math.round(totalRevenue),
  })
}
