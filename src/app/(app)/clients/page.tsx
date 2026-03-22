'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api-client'
import { EmptyState } from '@/components/shared/EmptyState'
import type { Client } from '@/lib/types'

function formatEur(val: number | undefined): string {
  if (val == null || val === 0) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val)
}

export default function ClientsPage() {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState<'name' | 'totalRevenue' | 'engagementCount' | 'projectCount'>('totalRevenue')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    api.getClients().then(setClients).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    let result = [...clients]
    if (search) {
      const lower = search.toLowerCase()
      result = result.filter(c => c.name.toLowerCase().includes(lower) || c.aliases.some(a => a.toLowerCase().includes(lower)))
    }
    result.sort((a, b) => {
      let cmp = 0
      if (sortField === 'name') cmp = a.name.localeCompare(b.name)
      else cmp = (a[sortField] || 0) - (b[sortField] || 0)
      return sortDir === 'desc' ? -cmp : cmp
    })
    return result
  }, [clients, search, sortField, sortDir])

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('desc') }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-full bg-[var(--c-white)] text-[var(--c-gray-400)] text-[13px]">Loading...</div>
  }

  return (
    <div className="h-full overflow-y-auto bg-[var(--c-white)]">
      <div className="max-w-[1000px] px-4 sm:px-6 md:px-[48px] py-10">
        <h1 className="text-[1.4rem] font-[300] tracking-[-0.02em] text-[var(--c-gray-900)] mb-6">Clients</h1>

        {clients.length === 0 ? (
          <EmptyState
            title="No clients yet"
            description="Import engagement data to populate your client list."
          />
        ) : (
          <>
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search clients..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="text-[13px] px-3 py-2 bg-transparent border-b border-[var(--c-gray-200)] focus:border-[var(--c-gray-900)] focus:outline-none transition-colors w-64"
              />
              <span className="text-[11px] text-[var(--c-gray-400)] ml-3">{filtered.length} clients</span>
            </div>

            <div className="border border-[var(--c-gray-100)] rounded-[var(--radius-sm)] overflow-hidden">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="bg-[var(--c-gray-50)] text-[var(--c-gray-500)]">
                    <th className="text-left px-3 py-2.5 font-[450] cursor-pointer hover:text-[var(--c-gray-700)]" onClick={() => handleSort('name')}>
                      Client {sortField === 'name' && (sortDir === 'desc' ? '↓' : '↑')}
                    </th>
                    <th className="text-right px-3 py-2.5 font-[450] cursor-pointer hover:text-[var(--c-gray-700)]" onClick={() => handleSort('totalRevenue')}>
                      Total EUR {sortField === 'totalRevenue' && (sortDir === 'desc' ? '↓' : '↑')}
                    </th>
                    <th className="text-right px-3 py-2.5 font-[450] cursor-pointer hover:text-[var(--c-gray-700)]" onClick={() => handleSort('engagementCount')}>
                      Engagements {sortField === 'engagementCount' && (sortDir === 'desc' ? '↓' : '↑')}
                    </th>
                    <th className="text-right px-3 py-2.5 font-[450] cursor-pointer hover:text-[var(--c-gray-700)]" onClick={() => handleSort('projectCount')}>
                      Case Studies {sortField === 'projectCount' && (sortDir === 'desc' ? '↓' : '↑')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => router.push(`/clients/${c.id}`)}
                      className="border-t border-[var(--c-gray-50)] hover:bg-[var(--c-gray-50)] cursor-pointer transition-colors"
                    >
                      <td className="px-3 py-2.5 text-[var(--c-gray-800)] font-[450]">{c.name}</td>
                      <td className="px-3 py-2.5 text-right text-[var(--c-gray-600)] tabular-nums">{formatEur(c.totalRevenue)}</td>
                      <td className="px-3 py-2.5 text-right text-[var(--c-gray-500)] tabular-nums">{c.engagementCount || 0}</td>
                      <td className="px-3 py-2.5 text-right text-[var(--c-gray-500)] tabular-nums">{c.projectCount || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
