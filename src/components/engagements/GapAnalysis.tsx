'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

function formatEur(val: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val)
}

interface GapData {
  highRevenue: { id: string; name: string; totalRevenue: number; projectCount: number; coverage: number }[]
  declining: { id: string; name: string; totalRevenue: number; completeProjectCount: number; lastYearRevenue: number; prevYearRevenue: number; lastYear: number; prevYear: number }[]
  strongPortfolio: { id: string; name: string; totalRevenue: number; completeProjectCount: number }[]
}

export function GapAnalysis() {
  const router = useRouter()
  const [data, setData] = useState<GapData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/engagements/gaps')
      .then(r => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading || !data) return null

  const hasData = data.highRevenue.length > 0 || data.declining.length > 0 || data.strongPortfolio.length > 0
  if (!hasData) return null

  return (
    <div className="mt-10 border-t border-[var(--c-gray-100)] pt-8">
      <h2 className="text-[14px] font-[450] text-[var(--c-gray-900)] mb-6">Case Study Gaps</h2>

      {/* High revenue, no case studies */}
      {data.highRevenue.length > 0 && (
        <div className="mb-8">
          <h3 className="text-[12px] font-[450] text-[var(--c-gray-600)] mb-1">High Revenue, No Case Studies</h3>
          <p className="text-[11px] text-[var(--c-gray-400)] mb-3">Clients with significant revenue but no case studies in the archive.</p>
          <div className="flex flex-col gap-1">
            {data.highRevenue.map(c => (
              <button
                key={c.id}
                onClick={() => router.push(`/clients/${c.id}`)}
                className="flex items-center gap-4 py-2 px-3 rounded-[var(--radius-sm)] hover:bg-[var(--c-gray-50)] transition-colors text-left"
              >
                <span className="text-[12px] font-[450] text-[var(--c-gray-800)] flex-1">{c.name}</span>
                <span className="text-[11px] text-[var(--c-gray-500)] tabular-nums">{formatEur(c.totalRevenue)}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-600">0 case studies</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Well-documented, declining revenue */}
      {data.declining.length > 0 && (
        <div className="mb-8">
          <h3 className="text-[12px] font-[450] text-[var(--c-gray-600)] mb-1">Well-Documented, Declining Revenue</h3>
          <p className="text-[11px] text-[var(--c-gray-400)] mb-3">Clients with complete case studies but revenue dropping significantly.</p>
          <div className="flex flex-col gap-1">
            {data.declining.map(c => (
              <button
                key={c.id}
                onClick={() => router.push(`/clients/${c.id}`)}
                className="flex items-center gap-4 py-2 px-3 rounded-[var(--radius-sm)] hover:bg-[var(--c-gray-50)] transition-colors text-left"
              >
                <span className="text-[12px] font-[450] text-[var(--c-gray-800)] flex-1">{c.name}</span>
                <span className="text-[11px] text-[var(--c-gray-500)]">{c.completeProjectCount} case studies</span>
                <span className="text-[10px] text-red-500 tabular-nums">
                  {formatEur(c.prevYearRevenue)} ({c.prevYear}) → {formatEur(c.lastYearRevenue)} ({c.lastYear})
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Strong portfolio, low revenue */}
      {data.strongPortfolio.length > 0 && (
        <div>
          <h3 className="text-[12px] font-[450] text-[var(--c-gray-600)] mb-1">Strong Portfolio, Low Revenue</h3>
          <p className="text-[11px] text-[var(--c-gray-400)] mb-3">Clients with multiple polished case studies but below-median revenue — potential growth areas.</p>
          <div className="flex flex-col gap-1">
            {data.strongPortfolio.map(c => (
              <button
                key={c.id}
                onClick={() => router.push(`/clients/${c.id}`)}
                className="flex items-center gap-4 py-2 px-3 rounded-[var(--radius-sm)] hover:bg-[var(--c-gray-50)] transition-colors text-left"
              >
                <span className="text-[12px] font-[450] text-[var(--c-gray-800)] flex-1">{c.name}</span>
                <span className="text-[11px] text-green-600">{c.completeProjectCount} case studies</span>
                <span className="text-[11px] text-[var(--c-gray-500)] tabular-nums">{formatEur(c.totalRevenue)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
