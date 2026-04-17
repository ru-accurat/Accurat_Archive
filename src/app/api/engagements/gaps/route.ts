import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { requireBusinessAccess } from '@/lib/api-auth'

export async function GET() {
  const deny = await requireBusinessAccess()
  if (deny) return deny
  const supabase = createServiceClient()

  // Get all clients
  const { data: clients } = await supabase.from('clients').select('id, name')

  // Get engagements grouped by client
  const { data: engagements } = await supabase
    .from('engagements')
    .select('id, client_id, year, amount_eur')

  // Get engagement-project links
  const { data: links } = await supabase
    .from('engagement_projects')
    .select('engagement_id')

  // Get projects by client
  const { data: projects } = await supabase
    .from('projects')
    .select('id, client_id, description, media_order')
    .not('client_id', 'is', null)

  if (!clients || !engagements) {
    return NextResponse.json({ highRevenue: [], declining: [], strongPortfolio: [] })
  }

  const linkedEngIds = new Set((links || []).map((l: { engagement_id: string }) => l.engagement_id))

  // Build per-client stats
  interface ClientStats {
    id: string
    name: string
    totalRevenue: number
    linkedRevenue: number
    projectCount: number
    completeProjectCount: number
    revenueByYear: Record<number, number>
  }

  const statsMap = new Map<string, ClientStats>()

  for (const c of clients as { id: string; name: string }[]) {
    statsMap.set(c.id, {
      id: c.id,
      name: c.name,
      totalRevenue: 0,
      linkedRevenue: 0,
      projectCount: 0,
      completeProjectCount: 0,
      revenueByYear: {},
    })
  }

  for (const e of engagements as { id: string; client_id: string; year: number; amount_eur: number | null }[]) {
    const s = statsMap.get(e.client_id)
    if (!s) continue
    const eur = e.amount_eur ? Number(e.amount_eur) : 0
    s.totalRevenue += eur
    s.revenueByYear[e.year] = (s.revenueByYear[e.year] || 0) + eur
    if (linkedEngIds.has(e.id)) {
      s.linkedRevenue += eur
    }
  }

  for (const p of (projects || []) as { id: string; client_id: string; description: string; media_order: string[] | null }[]) {
    const s = statsMap.get(p.client_id)
    if (!s) continue
    s.projectCount++
    if (p.description && p.media_order && p.media_order.length > 0) {
      s.completeProjectCount++
    }
  }

  const allStats = [...statsMap.values()]

  // 1. High-revenue clients with no/few case studies (> €50k, coverage < 30%)
  const highRevenue = allStats
    .filter(s => s.totalRevenue > 50000 && s.projectCount === 0)
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, 15)
    .map(s => ({
      id: s.id,
      name: s.name,
      totalRevenue: Math.round(s.totalRevenue),
      projectCount: s.projectCount,
      coverage: s.totalRevenue > 0 ? Math.round((s.linkedRevenue / s.totalRevenue) * 100) : 0,
    }))

  // 2. Well-documented clients with declining revenue
  const declining = allStats
    .filter(s => {
      if (s.completeProjectCount === 0) return false
      const years = Object.keys(s.revenueByYear).map(Number).sort()
      if (years.length < 2) return false
      const last = s.revenueByYear[years[years.length - 1]] || 0
      const prev = s.revenueByYear[years[years.length - 2]] || 0
      return prev > 0 && last < prev * 0.7 // 30%+ decline
    })
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, 15)
    .map(s => {
      const years = Object.keys(s.revenueByYear).map(Number).sort()
      const lastYear = years[years.length - 1]
      const prevYear = years[years.length - 2]
      return {
        id: s.id,
        name: s.name,
        totalRevenue: Math.round(s.totalRevenue),
        completeProjectCount: s.completeProjectCount,
        lastYearRevenue: Math.round(s.revenueByYear[lastYear] || 0),
        prevYearRevenue: Math.round(s.revenueByYear[prevYear] || 0),
        lastYear,
        prevYear,
      }
    })

  // 3. Strong portfolio, low revenue — clients with multiple case studies but below-median revenue
  const withRevenue = allStats.filter(s => s.totalRevenue > 0)
  const medianRevenue = withRevenue.length > 0
    ? withRevenue.sort((a, b) => a.totalRevenue - b.totalRevenue)[Math.floor(withRevenue.length / 2)].totalRevenue
    : 0

  const strongPortfolio = allStats
    .filter(s => s.completeProjectCount >= 2 && s.totalRevenue < medianRevenue && s.totalRevenue > 0)
    .sort((a, b) => b.completeProjectCount - a.completeProjectCount)
    .slice(0, 15)
    .map(s => ({
      id: s.id,
      name: s.name,
      totalRevenue: Math.round(s.totalRevenue),
      completeProjectCount: s.completeProjectCount,
    }))

  return NextResponse.json({ highRevenue, declining, strongPortfolio })
}
