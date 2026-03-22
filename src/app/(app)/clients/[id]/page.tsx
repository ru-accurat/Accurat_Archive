'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api-client'
import { Breadcrumb } from '@/components/shared/Breadcrumb'
import { InlineEditCell } from '@/components/shared/InlineEditCell'
import type { Client, Engagement, Project } from '@/lib/types'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

function formatEur(val: number | null | undefined): string {
  if (val == null || val === 0) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val)
}

interface ClientDetail extends Client {
  revenueByYear: Record<number, number>
  engagements: Engagement[]
  projects: (Pick<Project, 'id' | 'fullName' | 'client' | 'projectName' | 'folderName' | 'start' | 'section'> & { thumbImage?: string; heroImage?: string })[]
}

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [client, setClient] = useState<ClientDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getClient(id)
      .then((data) => setClient(data as unknown as ClientDetail))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return <div className="flex items-center justify-center h-full bg-[var(--c-white)] text-[var(--c-gray-400)] text-[13px]">Loading...</div>
  }

  if (!client) {
    return <div className="flex items-center justify-center h-full bg-[var(--c-white)] text-[var(--c-gray-400)] text-[13px]">Client not found</div>
  }

  const years = Object.keys(client.revenueByYear).map(Number).sort()
  const maxRevenue = Math.max(...Object.values(client.revenueByYear), 1)

  // Trend: compare last 2 years
  const lastYear = years[years.length - 1]
  const prevYear = years[years.length - 2]
  const trend = lastYear && prevYear
    ? client.revenueByYear[lastYear] > client.revenueByYear[prevYear] ? 'growing'
      : client.revenueByYear[lastYear] < client.revenueByYear[prevYear] ? 'declining' : 'stable'
    : null

  return (
    <div className="h-full overflow-y-auto bg-[var(--c-white)]">
      <div className="max-w-[1000px] px-4 sm:px-6 md:px-[48px] py-10">
        <div className="mb-4">
          <Breadcrumb items={[
            { label: 'Clients', href: '/clients' },
            { label: client.name },
          ]} />
        </div>

        {/* Header */}
        <div className="mb-8">
          <InlineEditCell
            value={client.name}
            onSave={async (v) => {
              await api.updateClient(id, { name: v })
              setClient(prev => prev ? { ...prev, name: v } : null)
            }}
            className="text-[1.4rem] font-[300] tracking-[-0.02em] !text-[var(--c-gray-900)]"
          />
          {client.aliases.length > 0 && (
            <div className="flex gap-1.5 mt-2">
              {client.aliases.map(a => (
                <span key={a} className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--c-gray-100)] text-[var(--c-gray-500)]">{a}</span>
              ))}
            </div>
          )}
        </div>

        {/* Key metrics */}
        <div className="flex gap-8 mb-8">
          <div>
            <div className="text-[24px] font-[300] text-[var(--c-gray-900)]">{formatEur(client.totalRevenue)}</div>
            <div className="text-[11px] text-[var(--c-gray-400)]">lifetime revenue</div>
          </div>
          <div>
            <div className="text-[24px] font-[300] text-[var(--c-gray-900)]">{client.engagementCount}</div>
            <div className="text-[11px] text-[var(--c-gray-400)]">engagements</div>
          </div>
          <div>
            <div className="text-[24px] font-[300] text-[var(--c-gray-900)]">{client.projectCount}</div>
            <div className="text-[11px] text-[var(--c-gray-400)]">case studies</div>
          </div>
          {trend && (
            <div>
              <div className={`text-[24px] font-[300] ${trend === 'growing' ? 'text-green-600' : trend === 'declining' ? 'text-red-500' : 'text-[var(--c-gray-400)]'}`}>
                {trend === 'growing' ? '↑' : trend === 'declining' ? '↓' : '→'}
              </div>
              <div className="text-[11px] text-[var(--c-gray-400)]">{trend}</div>
            </div>
          )}
          <div>
            <div className="text-[24px] font-[300] text-[var(--c-gray-600)]">{years[0] || '—'}</div>
            <div className="text-[11px] text-[var(--c-gray-400)]">first year</div>
          </div>
        </div>

        {/* Revenue by year chart */}
        {years.length > 0 && (
          <div className="mb-10">
            <h2 className="text-[13px] font-[450] text-[var(--c-gray-700)] mb-3">Revenue by Year</h2>
            <div className="flex items-end gap-2" style={{ height: 120 }}>
              {years.map(y => {
                const rev = client.revenueByYear[y] || 0
                const h = (rev / maxRevenue) * 100
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

        {/* Engagements table */}
        {client.engagements.length > 0 && (
          <div className="mb-10">
            <h2 className="text-[13px] font-[450] text-[var(--c-gray-700)] mb-3">Engagements ({client.engagements.length})</h2>
            <div className="border border-[var(--c-gray-100)] rounded-[var(--radius-sm)] overflow-hidden">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="bg-[var(--c-gray-50)] text-[var(--c-gray-500)]">
                    <th className="text-left px-3 py-2 font-[450]">Year</th>
                    <th className="text-left px-3 py-2 font-[450]">Project</th>
                    <th className="text-right px-3 py-2 font-[450]">EUR</th>
                    <th className="text-right px-3 py-2 font-[450]">USD</th>
                  </tr>
                </thead>
                <tbody>
                  {client.engagements.map((e) => (
                    <tr key={e.id} className="border-t border-[var(--c-gray-50)]">
                      <td className="px-3 py-2 text-[var(--c-gray-600)]">{e.year}</td>
                      <td className="px-3 py-2 text-[var(--c-gray-800)]">{e.projectName}</td>
                      <td className="px-3 py-2 text-right text-[var(--c-gray-600)] tabular-nums">{formatEur(e.amountEur)}</td>
                      <td className="px-3 py-2 text-right text-[var(--c-gray-500)] tabular-nums">{e.amountUsd != null ? formatEur(e.amountUsd).replace('€', '$') : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Linked case studies */}
        {client.projects.length > 0 && (
          <div>
            <h2 className="text-[13px] font-[450] text-[var(--c-gray-700)] mb-3">Case Studies ({client.projects.length})</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {client.projects.map((p) => {
                const img = p.thumbImage || p.heroImage
                const imgUrl = img ? `${SUPABASE_URL}/storage/v1/object/public/project-media/${p.folderName}/${img}` : null
                return (
                  <button
                    key={p.id}
                    onClick={() => router.push(`/project/${p.id}`)}
                    className="text-left group"
                  >
                    <div className="aspect-[4/3] rounded-[var(--radius-sm)] overflow-hidden bg-[var(--c-gray-100)] mb-2">
                      {imgUrl ? (
                        <img src={imgUrl} alt={p.projectName} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[var(--c-gray-300)] text-[10px]">No image</div>
                      )}
                    </div>
                    <p className="text-[11px] font-[500] text-[var(--c-gray-800)] truncate">{p.projectName}</p>
                    <p className="text-[10px] text-[var(--c-gray-400)]">{p.section} {p.start ? `· ${p.start}` : ''}</p>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
