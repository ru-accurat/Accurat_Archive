import Link from 'next/link'
import { headers } from 'next/headers'
import { Breadcrumb } from '@/components/shared/Breadcrumb'

export const dynamic = 'force-dynamic'

type Intel = {
  clientHealth: {
    id: string
    name: string
    lastEngagementYear: number | null
    projectCount: number
    avgCompleteness: number
    revenueThisYear: number
    revenueLastYear: number
    trend: 'growing' | 'stable' | 'declining'
    healthScore: number
  }[]
  coldClients: { id: string; name: string; lastEngagementYear: number | null; totalRevenue: number }[]
  topGrowing: { id: string; name: string; revenueThisYear: number; revenueLastYear: number; growthPct: number }[]
  dormantTier1: { id: string; name: string; lastEngagementYear: number | null; topTierProjects: number }[]
  concentration: { top3Pct: number; top5Pct: number; top10Pct: number; totalRevenue: number }
}

function formatEur(v: number): string {
  if (!v) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v)
}

async function fetchIntel(): Promise<Intel> {
  const h = await headers()
  const host = h.get('host') || 'localhost:3000'
  const proto = h.get('x-forwarded-proto') || 'http'
  const res = await fetch(`${proto}://${host}/api/clients/intelligence`, { cache: 'no-store' })
  if (!res.ok) {
    return {
      clientHealth: [],
      coldClients: [],
      topGrowing: [],
      dormantTier1: [],
      concentration: { top3Pct: 0, top5Pct: 0, top10Pct: 0, totalRevenue: 0 },
    }
  }
  return res.json()
}

function TrendBadge({ trend }: { trend: 'growing' | 'stable' | 'declining' }) {
  const color =
    trend === 'growing'
      ? 'text-emerald-700 bg-emerald-50'
      : trend === 'declining'
      ? 'text-red-700 bg-red-50'
      : 'text-[var(--c-gray-500)] bg-[var(--c-gray-50)]'
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded ${color}`}>{trend}</span>
  )
}

function SummaryCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="border border-[var(--c-gray-100)] rounded-[var(--radius-sm)] p-4 bg-white">
      <div className="text-[11px] uppercase tracking-wide text-[var(--c-gray-400)]">{label}</div>
      <div className="text-[22px] font-[500] mt-1 text-[var(--c-gray-800)]">{value}</div>
      {sub && <div className="text-[11px] text-[var(--c-gray-500)] mt-0.5">{sub}</div>}
    </div>
  )
}

export default async function ClientDashboardPage() {
  const intel = await fetchIntel()
  const topHealth = intel.clientHealth.slice(0, 20)

  return (
    <div className="h-full overflow-y-auto bg-[var(--c-white)]">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 md:px-[48px] py-8">
        <div className="mb-4">
          <Breadcrumb items={[{ label: 'Clients', href: '/clients' }, { label: 'Dashboard' }]} />
        </div>
        <div className="flex items-baseline justify-between mb-6">
          <h1 className="text-[24px] font-[500] text-[var(--c-gray-800)]">Client Intelligence</h1>
          <Link href="/clients" className="text-[12px] text-[var(--c-gray-500)] hover:text-[var(--c-gray-800)]">
            ← Back to clients
          </Link>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <SummaryCard
            label="Total revenue"
            value={formatEur(intel.concentration.totalRevenue)}
            sub="All time"
          />
          <SummaryCard
            label="Top 3 concentration"
            value={`${intel.concentration.top3Pct}%`}
            sub="of total revenue"
          />
          <SummaryCard
            label="Top 5 concentration"
            value={`${intel.concentration.top5Pct}%`}
            sub="of total revenue"
          />
          <SummaryCard
            label="Top 10 concentration"
            value={`${intel.concentration.top10Pct}%`}
            sub="of total revenue"
          />
        </div>

        {/* Client Health table */}
        <section className="mb-10">
          <h2 className="text-[14px] font-[500] text-[var(--c-gray-800)] mb-2">Top clients by health score</h2>
          <p className="text-[11px] text-[var(--c-gray-500)] mb-3">
            Score combines recency (30), revenue trend (30), case-study completeness (20), project count (20).
          </p>
          <div className="border border-[var(--c-gray-100)] rounded-[var(--radius-sm)] overflow-hidden bg-white">
            <table className="w-full text-[12px]">
              <thead className="bg-[var(--c-gray-50)] text-[var(--c-gray-500)] text-left">
                <tr>
                  <th className="px-3 py-2 font-[450]">Client</th>
                  <th className="px-3 py-2 font-[450] text-right">Score</th>
                  <th className="px-3 py-2 font-[450] text-right">Last eng.</th>
                  <th className="px-3 py-2 font-[450] text-right">Projects</th>
                  <th className="px-3 py-2 font-[450] text-right">Avg compl.</th>
                  <th className="px-3 py-2 font-[450] text-right">This year</th>
                  <th className="px-3 py-2 font-[450] text-right">Last year</th>
                  <th className="px-3 py-2 font-[450]">Trend</th>
                </tr>
              </thead>
              <tbody>
                {topHealth.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-3 py-6 text-center text-[var(--c-gray-400)]">No data</td>
                  </tr>
                )}
                {topHealth.map(c => (
                  <tr key={c.id} className="border-t border-[var(--c-gray-50)] hover:bg-[var(--c-gray-50)]">
                    <td className="px-3 py-2">
                      <Link href={`/clients/${c.id}`} className="text-[var(--c-gray-800)] hover:underline">
                        {c.name}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-right font-[500] text-[var(--c-gray-800)]">{c.healthScore}</td>
                    <td className="px-3 py-2 text-right text-[var(--c-gray-600)]">{c.lastEngagementYear ?? '—'}</td>
                    <td className="px-3 py-2 text-right text-[var(--c-gray-600)]">{c.projectCount}</td>
                    <td className="px-3 py-2 text-right text-[var(--c-gray-600)]">{c.avgCompleteness}/10</td>
                    <td className="px-3 py-2 text-right text-[var(--c-gray-600)]">{formatEur(c.revenueThisYear)}</td>
                    <td className="px-3 py-2 text-right text-[var(--c-gray-600)]">{formatEur(c.revenueLastYear)}</td>
                    <td className="px-3 py-2"><TrendBadge trend={c.trend} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Top growing */}
        <section className="mb-10">
          <h2 className="text-[14px] font-[500] text-[var(--c-gray-800)] mb-3">Top growing clients (YoY)</h2>
          <div className="border border-[var(--c-gray-100)] rounded-[var(--radius-sm)] overflow-hidden bg-white">
            <table className="w-full text-[12px]">
              <thead className="bg-[var(--c-gray-50)] text-[var(--c-gray-500)] text-left">
                <tr>
                  <th className="px-3 py-2 font-[450]">Client</th>
                  <th className="px-3 py-2 font-[450] text-right">Growth</th>
                  <th className="px-3 py-2 font-[450] text-right">This year</th>
                  <th className="px-3 py-2 font-[450] text-right">Last year</th>
                </tr>
              </thead>
              <tbody>
                {intel.topGrowing.length === 0 && (
                  <tr><td colSpan={4} className="px-3 py-6 text-center text-[var(--c-gray-400)]">No growing clients</td></tr>
                )}
                {intel.topGrowing.map(c => (
                  <tr key={c.id} className="border-t border-[var(--c-gray-50)] hover:bg-[var(--c-gray-50)]">
                    <td className="px-3 py-2">
                      <Link href={`/clients/${c.id}`} className="text-[var(--c-gray-800)] hover:underline">{c.name}</Link>
                    </td>
                    <td className="px-3 py-2 text-right text-emerald-700 font-[500]">+{c.growthPct}%</td>
                    <td className="px-3 py-2 text-right text-[var(--c-gray-600)]">{formatEur(c.revenueThisYear)}</td>
                    <td className="px-3 py-2 text-right text-[var(--c-gray-600)]">{formatEur(c.revenueLastYear)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Cold clients + Dormant Tier 1 side by side */}
        <div className="grid md:grid-cols-2 gap-6 mb-10">
          <section>
            <h2 className="text-[14px] font-[500] text-[var(--c-gray-800)] mb-3">Cold clients (re-engage)</h2>
            <div className="border border-[var(--c-gray-100)] rounded-[var(--radius-sm)] overflow-hidden bg-white">
              <table className="w-full text-[12px]">
                <thead className="bg-[var(--c-gray-50)] text-[var(--c-gray-500)] text-left">
                  <tr>
                    <th className="px-3 py-2 font-[450]">Client</th>
                    <th className="px-3 py-2 font-[450] text-right">Last</th>
                    <th className="px-3 py-2 font-[450] text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {intel.coldClients.length === 0 && (
                    <tr><td colSpan={3} className="px-3 py-6 text-center text-[var(--c-gray-400)]">No cold clients</td></tr>
                  )}
                  {intel.coldClients.map(c => (
                    <tr key={c.id} className="border-t border-[var(--c-gray-50)] hover:bg-[var(--c-gray-50)]">
                      <td className="px-3 py-2">
                        <Link href={`/clients/${c.id}`} className="text-[var(--c-gray-800)] hover:underline">{c.name}</Link>
                      </td>
                      <td className="px-3 py-2 text-right text-[var(--c-gray-600)]">{c.lastEngagementYear ?? '—'}</td>
                      <td className="px-3 py-2 text-right text-[var(--c-gray-600)]">{formatEur(c.totalRevenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-[14px] font-[500] text-[var(--c-gray-800)] mb-3">Dormant Tier 1</h2>
            <div className="border border-[var(--c-gray-100)] rounded-[var(--radius-sm)] overflow-hidden bg-white">
              <table className="w-full text-[12px]">
                <thead className="bg-[var(--c-gray-50)] text-[var(--c-gray-500)] text-left">
                  <tr>
                    <th className="px-3 py-2 font-[450]">Client</th>
                    <th className="px-3 py-2 font-[450] text-right">Last</th>
                    <th className="px-3 py-2 font-[450] text-right">T1 projects</th>
                  </tr>
                </thead>
                <tbody>
                  {intel.dormantTier1.length === 0 && (
                    <tr><td colSpan={3} className="px-3 py-6 text-center text-[var(--c-gray-400)]">None</td></tr>
                  )}
                  {intel.dormantTier1.map(c => (
                    <tr key={c.id} className="border-t border-[var(--c-gray-50)] hover:bg-[var(--c-gray-50)]">
                      <td className="px-3 py-2">
                        <Link href={`/clients/${c.id}`} className="text-[var(--c-gray-800)] hover:underline">{c.name}</Link>
                      </td>
                      <td className="px-3 py-2 text-right text-[var(--c-gray-600)]">{c.lastEngagementYear ?? '—'}</td>
                      <td className="px-3 py-2 text-right text-[var(--c-gray-600)]">{c.topTierProjects}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
