'use client'

import { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api-client'
import { EmptyState } from '@/components/shared/EmptyState'
import type { Client } from '@/lib/types'

function formatEur(val: number | undefined): string {
  if (val == null || val === 0) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val)
}

export function ClientsPageClient({ initialClients }: { initialClients: Client[] }) {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>(initialClients)
  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState<'name' | 'totalRevenue' | 'engagementCount' | 'projectCount'>('totalRevenue')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [mergeSource, setMergeSource] = useState<Client | null>(null)
  const [merging, setMerging] = useState(false)

  const reloadClients = useCallback(async () => {
    const data = await api.getClients()
    setClients(data)
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

  const handleMerge = useCallback(async (targetId: string) => {
    if (!mergeSource || targetId === mergeSource.id) return
    const target = clients.find(c => c.id === targetId)
    if (!target) return
    if (!confirm(`Merge "${mergeSource.name}" into "${target.name}"? All engagements and projects will be moved to "${target.name}".`)) return

    setMerging(true)
    try {
      await api.mergeClients(mergeSource.id, targetId)
      setMergeSource(null)
      await reloadClients()
    } catch (err) {
      alert('Merge failed: ' + String(err))
    }
    setMerging(false)
  }, [mergeSource, clients, reloadClients])

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
            <div className="flex items-center gap-3 mb-4">
              <input
                type="text"
                placeholder="Search clients..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="text-[13px] px-3 py-2 bg-transparent border-b border-[var(--c-gray-200)] focus:border-[var(--c-gray-900)] focus:outline-none transition-colors w-64"
              />
              <span className="text-[11px] text-[var(--c-gray-400)]">{filtered.length} clients</span>

              {mergeSource && (
                <div className="ml-auto flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-[var(--radius-sm)] px-3 py-1.5">
                  <span className="text-[11px] text-yellow-700">
                    Merging <strong>{mergeSource.name}</strong> — click a target client
                  </span>
                  <button
                    onClick={() => setMergeSource(null)}
                    className="text-[10px] text-yellow-600 hover:text-yellow-800 font-[450]"
                  >
                    Cancel
                  </button>
                </div>
              )}
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
                    <th className="px-3 py-2.5 w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => {
                        if (mergeSource) {
                          handleMerge(c.id)
                        } else {
                          router.push(`/clients/${c.id}`)
                        }
                      }}
                      className={`border-t border-[var(--c-gray-50)] cursor-pointer transition-colors group ${
                        mergeSource?.id === c.id
                          ? 'bg-yellow-50'
                          : mergeSource
                            ? 'hover:bg-green-50'
                            : 'hover:bg-[var(--c-gray-50)]'
                      }`}
                    >
                      <td className="px-3 py-2.5 text-[var(--c-gray-800)] font-[450]">
                        {c.name}
                        {mergeSource && mergeSource.id !== c.id && (
                          <span className="text-[10px] text-green-600 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            merge here
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right text-[var(--c-gray-600)] tabular-nums">{formatEur(c.totalRevenue)}</td>
                      <td className="px-3 py-2.5 text-right text-[var(--c-gray-500)] tabular-nums">{c.engagementCount || 0}</td>
                      <td className="px-3 py-2.5 text-right text-[var(--c-gray-500)] tabular-nums">{c.projectCount || 0}</td>
                      <td className="px-3 py-2.5 text-right">
                        {!mergeSource && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setMergeSource(c) }}
                            disabled={merging}
                            className="text-[10px] text-[var(--c-gray-400)] hover:text-[var(--c-gray-700)] transition-colors opacity-0 group-hover:opacity-100"
                            title="Merge this client into another"
                          >
                            Merge
                          </button>
                        )}
                      </td>
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
