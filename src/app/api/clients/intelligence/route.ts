import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { requireBusinessAccess } from '@/lib/api-auth'

/**
 * Client Intelligence — BD-focused signals computed from engagements + projects.
 *
 * Health score formula (0-100):
 *   - Recency (30 pts): 30 if last engagement is in the current year, linearly
 *     decaying to 0 at 5+ years stale.
 *   - Revenue trend (30 pts): 30 if revenueThisYear > revenueLastYear * 1.2
 *     (growing), 20 if roughly stable (±20%), 10 if declining but present,
 *     0 if no revenue either year.
 *   - Case-study completeness (20 pts): avg completeness across linked projects
 *     (0-10 scale) * 2.
 *   - Project count (20 pts): min(projectCount, 10) * 2.
 *
 * "Cold" = no engagements in the last 2 years (strictly: last engagement year
 * <= currentYear - 2).
 * "Growing" = revenueThisYear > revenueLastYear * 1.2.
 * "Dormant Tier 1" = clients with any tier=1 project whose last engagement is
 * 2+ years old.
 */

type EngRow = { client_id: string; year: number | null; amount_eur: number | null }
type ProjRow = {
  id: string
  client_id: string | null
  tier: number | null
  tagline: string | null
  description: string | null
  challenge: string | null
  solution: string | null
  deliverables: string | null
  client_quotes: string | null
  team: string[] | null
  urls: string[] | null
  domains: string[] | null
  services: string[] | null
}
type ClientRow = { id: string; name: string }

function completenessOf(p: ProjRow): number {
  let c = 0
  if (p.tagline) c++
  if (p.description) c++
  if (p.challenge) c++
  if (p.solution) c++
  if (p.deliverables) c++
  if (p.client_quotes) c++
  if ((p.team?.length || 0) > 0) c++
  if ((p.urls?.length || 0) > 0) c++
  if ((p.domains?.length || 0) > 0) c++
  if ((p.services?.length || 0) > 0) c++
  return c
}

export async function GET() {
  const deny = await requireBusinessAccess()
  if (deny) return deny
  const supabase = createServiceClient()
  const currentYear = new Date().getFullYear()
  const lastYear = currentYear - 1

  const [clientsRes, engsRes, projsRes] = await Promise.all([
    supabase.from('clients').select('id, name').order('name'),
    supabase.from('engagements').select('client_id, year, amount_eur'),
    supabase
      .from('projects')
      .select('id, client_id, tier, tagline, description, challenge, solution, deliverables, client_quotes, team, urls, domains, services')
      .not('client_id', 'is', null),
  ])

  if (clientsRes.error) {
    return NextResponse.json({ error: clientsRes.error.message }, { status: 500 })
  }

  const clients = (clientsRes.data || []) as ClientRow[]
  const engagements = (engsRes.data || []) as EngRow[]
  const projects = (projsRes.data || []) as ProjRow[]

  type Agg = {
    id: string
    name: string
    totalRevenue: number
    revenueThisYear: number
    revenueLastYear: number
    lastEngagementYear: number | null
    projectCount: number
    completenessSum: number
    completenessCount: number
    topTierProjects: number
  }

  const aggMap = new Map<string, Agg>()
  for (const c of clients) {
    aggMap.set(c.id, {
      id: c.id,
      name: c.name,
      totalRevenue: 0,
      revenueThisYear: 0,
      revenueLastYear: 0,
      lastEngagementYear: null,
      projectCount: 0,
      completenessSum: 0,
      completenessCount: 0,
      topTierProjects: 0,
    })
  }

  for (const e of engagements) {
    const a = aggMap.get(e.client_id)
    if (!a) continue
    const amt = e.amount_eur != null ? Number(e.amount_eur) : 0
    a.totalRevenue += amt
    if (e.year === currentYear) a.revenueThisYear += amt
    if (e.year === lastYear) a.revenueLastYear += amt
    if (e.year != null && (a.lastEngagementYear == null || e.year > a.lastEngagementYear)) {
      a.lastEngagementYear = e.year
    }
  }

  for (const p of projects) {
    if (!p.client_id) continue
    const a = aggMap.get(p.client_id)
    if (!a) continue
    a.projectCount++
    a.completenessSum += completenessOf(p)
    a.completenessCount++
    if (p.tier === 1) a.topTierProjects++
  }

  const aggs = Array.from(aggMap.values())

  function trendOf(a: Agg): 'growing' | 'stable' | 'declining' {
    if (a.revenueThisYear === 0 && a.revenueLastYear === 0) return 'stable'
    if (a.revenueThisYear > a.revenueLastYear * 1.2) return 'growing'
    if (a.revenueThisYear < a.revenueLastYear * 0.8) return 'declining'
    return 'stable'
  }

  function healthScore(a: Agg): number {
    // Recency (30)
    let recency = 0
    if (a.lastEngagementYear != null) {
      const stale = currentYear - a.lastEngagementYear
      recency = Math.max(0, 30 - (stale * 6))
    }
    // Trend (30)
    const t = trendOf(a)
    const hasRev = a.revenueThisYear > 0 || a.revenueLastYear > 0
    let trendPts = 0
    if (!hasRev) trendPts = 0
    else if (t === 'growing') trendPts = 30
    else if (t === 'stable') trendPts = 20
    else trendPts = 10
    // Completeness (20)
    const avgComp = a.completenessCount > 0 ? a.completenessSum / a.completenessCount : 0
    const compPts = avgComp * 2
    // Project count (20)
    const projPts = Math.min(a.projectCount, 10) * 2
    return Math.round(recency + trendPts + compPts + projPts)
  }

  const clientHealth = aggs
    .map(a => {
      const avgComp = a.completenessCount > 0 ? a.completenessSum / a.completenessCount : 0
      return {
        id: a.id,
        name: a.name,
        lastEngagementYear: a.lastEngagementYear,
        projectCount: a.projectCount,
        avgCompleteness: Math.round(avgComp * 10) / 10,
        revenueThisYear: a.revenueThisYear,
        revenueLastYear: a.revenueLastYear,
        trend: trendOf(a),
        healthScore: healthScore(a),
      }
    })
    .sort((x, y) => y.healthScore - x.healthScore)

  const coldThreshold = currentYear - 2
  const coldClients = aggs
    .filter(a => a.lastEngagementYear != null && a.lastEngagementYear <= coldThreshold && a.totalRevenue > 0)
    .map(a => ({
      id: a.id,
      name: a.name,
      lastEngagementYear: a.lastEngagementYear,
      totalRevenue: a.totalRevenue,
    }))
    .sort((x, y) => y.totalRevenue - x.totalRevenue)
    .slice(0, 25)

  const topGrowing = aggs
    .filter(a => a.revenueThisYear > a.revenueLastYear * 1.2 && a.revenueLastYear > 0)
    .map(a => ({
      id: a.id,
      name: a.name,
      revenueThisYear: a.revenueThisYear,
      revenueLastYear: a.revenueLastYear,
      growthPct: a.revenueLastYear > 0
        ? Math.round(((a.revenueThisYear - a.revenueLastYear) / a.revenueLastYear) * 100)
        : 0,
    }))
    .sort((x, y) => y.growthPct - x.growthPct)
    .slice(0, 25)

  const dormantTier1 = aggs
    .filter(a =>
      a.topTierProjects > 0 &&
      a.lastEngagementYear != null &&
      a.lastEngagementYear <= coldThreshold
    )
    .map(a => ({
      id: a.id,
      name: a.name,
      lastEngagementYear: a.lastEngagementYear,
      topTierProjects: a.topTierProjects,
    }))
    .sort((x, y) => y.topTierProjects - x.topTierProjects)
    .slice(0, 25)

  const totalRevenue = aggs.reduce((s, a) => s + a.totalRevenue, 0)
  const sortedByRev = [...aggs].sort((x, y) => y.totalRevenue - x.totalRevenue)
  const sumN = (n: number) =>
    sortedByRev.slice(0, n).reduce((s, a) => s + a.totalRevenue, 0)
  const pct = (v: number) => (totalRevenue > 0 ? Math.round((v / totalRevenue) * 1000) / 10 : 0)
  const concentration = {
    top3Pct: pct(sumN(3)),
    top5Pct: pct(sumN(5)),
    top10Pct: pct(sumN(10)),
    totalRevenue,
  }

  return NextResponse.json(
    { clientHealth, coldClients, topGrowing, dormantTier1, concentration },
    {
      headers: {
        'Cache-Control': 'private, max-age=60, stale-while-revalidate=600',
      },
    }
  )
}
