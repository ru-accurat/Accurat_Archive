'use client'

import { useState, useEffect } from 'react'

function formatEur(val: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val)
}

interface AnalyticsData {
  byYear: Record<string, number>
  byDomain: Record<string, number>
  byService: Record<string, number>
  byUnit: Record<string, number>
  byOutput: Record<string, number>
  topClients: { name: string; revenue: number; percentage: number }[]
  concentration: number
  totalRevenue: number
}

type BreakdownTab = 'domain' | 'service' | 'unit' | 'output' | 'clients'

export function RevenueBreakdown() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<BreakdownTab>('domain')

  useEffect(() => {
    fetch('/api/engagements/analytics')
      .then(r => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading || !data) return null

  const years = Object.keys(data.byYear).map(Number).sort()
  const maxYearRev = Math.max(...Object.values(data.byYear), 1)

  const tabs: { key: BreakdownTab; label: string }[] = [
    { key: 'domain', label: 'Domain' },
    { key: 'service', label: 'Service' },
    { key: 'unit', label: 'Unit' },
    { key: 'output', label: 'Category' },
    { key: 'clients', label: 'Top Clients' },
  ]

  const breakdownData: Record<string, number> =
    tab === 'domain' ? data.byDomain
      : tab === 'service' ? data.byService
        : tab === 'unit' ? data.byUnit
          : tab === 'output' ? data.byOutput
            : {}

  const maxBreakdown = Math.max(...Object.values(breakdownData), 1)

  return (
    <div className="mt-8 mb-10">
      {/* Revenue by year chart */}
      {years.length > 0 && (
        <div className="mb-8">
          <h3 className="text-[12px] font-[450] text-[var(--c-gray-600)] mb-3">Revenue by Year</h3>
          <div className="flex items-end gap-2" style={{ height: 140 }}>
            {years.map(y => {
              const rev = data.byYear[y] || 0
              const h = (rev / maxYearRev) * 100
              return (
                <div key={y} className="flex-1 flex flex-col items-center gap-1">
                  <div className="text-[9px] text-[var(--c-gray-400)] tabular-nums">{formatEur(rev)}</div>
                  <div className="w-full bg-[var(--c-gray-900)] rounded-t-[2px]" style={{ height: `${h}%`, minHeight: rev > 0 ? 4 : 0 }} />
                  <div className="text-[10px] text-[var(--c-gray-500)]">{y}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Breakdown tabs */}
      <div className="flex gap-1 mb-4 border-b border-[var(--c-gray-100)]">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`text-[11px] font-[450] px-3 py-2 border-b-2 -mb-px transition-colors ${
              tab === t.key ? 'border-[var(--c-gray-900)] text-[var(--c-gray-900)]' : 'border-transparent text-[var(--c-gray-400)] hover:text-[var(--c-gray-700)]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Breakdown bars or top clients */}
      {tab === 'clients' ? (
        <div>
          {data.concentration > 50 && (
            <p className="text-[11px] text-amber-600 mb-3">
              Top 3 clients represent {data.concentration}% of total revenue
            </p>
          )}
          {data.topClients.map(c => (
            <div key={c.name} className="flex items-center gap-3 py-1.5">
              <span className="text-[12px] text-[var(--c-gray-700)] w-36 truncate shrink-0">{c.name}</span>
              <div className="flex-1 h-4 bg-[var(--c-gray-50)] rounded-[2px] overflow-hidden">
                <div
                  className="h-full bg-[var(--c-gray-900)] rounded-[2px]"
                  style={{ width: `${(c.revenue / (data.topClients[0]?.revenue || 1)) * 100}%` }}
                />
              </div>
              <span className="text-[11px] text-[var(--c-gray-500)] tabular-nums w-24 text-right shrink-0">{formatEur(c.revenue)}</span>
              <span className="text-[10px] text-[var(--c-gray-400)] w-10 text-right shrink-0">{c.percentage}%</span>
            </div>
          ))}
        </div>
      ) : Object.keys(breakdownData).length === 0 ? (
        <p className="text-[12px] text-[var(--c-gray-400)] py-4">No linked engagement data for this breakdown. Link engagements to projects to see revenue by {tab}.</p>
      ) : (
        <div>
          {Object.entries(breakdownData).map(([name, revenue]) => (
            <div key={name} className="flex items-center gap-3 py-1.5">
              <span className="text-[12px] text-[var(--c-gray-700)] w-40 truncate shrink-0">{name}</span>
              <div className="flex-1 h-4 bg-[var(--c-gray-50)] rounded-[2px] overflow-hidden">
                <div
                  className="h-full bg-[var(--c-gray-900)] rounded-[2px]"
                  style={{ width: `${(revenue / maxBreakdown) * 100}%` }}
                />
              </div>
              <span className="text-[11px] text-[var(--c-gray-500)] tabular-nums w-24 text-right shrink-0">{formatEur(revenue)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
