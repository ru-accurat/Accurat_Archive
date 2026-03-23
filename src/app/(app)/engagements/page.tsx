'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { api } from '@/lib/api-client'
import { InlineEditCell } from '@/components/shared/InlineEditCell'
import { EmptyState } from '@/components/shared/EmptyState'
import { ImportModal } from '@/components/engagements/ImportModal'
import { ProjectLinker } from '@/components/engagements/ProjectLinker'
import { RevenueBreakdown } from '@/components/engagements/RevenueBreakdown'
import { GapAnalysis } from '@/components/engagements/GapAnalysis'
import type { Engagement, Client } from '@/lib/types'

function formatEur(val: number | null): string {
  if (val == null) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val)
}

function formatUsd(val: number | null): string {
  if (val == null) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val)
}

export default function EngagementsPage() {
  const [engagements, setEngagements] = useState<Engagement[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [importOpen, setImportOpen] = useState(false)
  const [yearFilter, setYearFilter] = useState<number | null>(null)
  const [clientFilter, setClientFilter] = useState<string | null>(null)
  const [linkedFilter, setLinkedFilter] = useState<'all' | 'linked' | 'unlinked'>('all')
  const [linkerEngagement, setLinkerEngagement] = useState<Engagement | null>(null)
  const [sortField, setSortField] = useState<'year' | 'clientName' | 'amountEur'>('year')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [editMode, setEditMode] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [eng, cli] = await Promise.all([api.getEngagements(), api.getClients()])
      setEngagements(eng)
      setClients(cli)
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // Unique years from engagements
  const years = useMemo(() => {
    const y = [...new Set(engagements.map(e => e.year))].sort((a, b) => b - a)
    return y
  }, [engagements])

  // Filter + sort
  const filtered = useMemo(() => {
    let result = [...engagements]
    if (yearFilter) result = result.filter(e => e.year === yearFilter)
    if (clientFilter) result = result.filter(e => e.clientId === clientFilter)
    if (linkedFilter === 'linked') result = result.filter(e => (e.linkedProjectCount || 0) > 0)
    if (linkedFilter === 'unlinked') result = result.filter(e => (e.linkedProjectCount || 0) === 0)

    result.sort((a, b) => {
      let cmp = 0
      if (sortField === 'year') cmp = a.year - b.year
      else if (sortField === 'clientName') cmp = (a.clientName || '').localeCompare(b.clientName || '')
      else if (sortField === 'amountEur') cmp = (a.amountEur || 0) - (b.amountEur || 0)
      return sortDir === 'desc' ? -cmp : cmp
    })

    return result
  }, [engagements, yearFilter, clientFilter, linkedFilter, sortField, sortDir])

  // Summary stats
  const totalRevenue = useMemo(() => engagements.reduce((sum, e) => sum + (e.amountEur || 0), 0), [engagements])
  const currentYear = new Date().getFullYear()
  const thisYearRevenue = useMemo(() => engagements.filter(e => e.year === currentYear).reduce((sum, e) => sum + (e.amountEur || 0), 0), [engagements, currentYear])
  const unlinkedCount = useMemo(() => engagements.filter(e => (e.linkedProjectCount || 0) === 0).length, [engagements])

  const handleSort = (field: 'year' | 'clientName' | 'amountEur') => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('desc') }
  }

  const handleUpdate = useCallback(async (id: string, field: string, value: string) => {
    const data: Record<string, unknown> = {}
    if (field === 'projectName') data.projectName = value
    else if (field === 'amountEur') data.amountEur = value ? parseFloat(value) : null
    else if (field === 'amountUsd') data.amountUsd = value ? parseFloat(value) : null
    else if (field === 'year') data.year = parseInt(value)
    else if (field === 'clientName') data.clientName = value

    await api.updateEngagement(id, data)
    const eng = await api.getEngagements()
    setEngagements(eng)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-[var(--c-white)] text-[var(--c-gray-400)] text-[13px]">
        Loading...
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto bg-[var(--c-white)]">
      <div className="max-w-[1200px] px-4 sm:px-6 md:px-[48px] py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-[1.4rem] font-[300] tracking-[-0.02em] text-[var(--c-gray-900)]">Engagements</h1>
          <div className="flex items-center gap-2">
            {engagements.length > 0 && (
              <button
                onClick={() => setEditMode(!editMode)}
                className={`text-[11px] font-[450] px-4 py-2 rounded-[var(--radius-sm)] transition-colors ${
                  editMode
                    ? 'bg-[var(--c-gray-900)] text-white'
                    : 'border border-[var(--c-gray-200)] text-[var(--c-gray-600)] hover:bg-[var(--c-gray-50)]'
                }`}
              >
                {editMode ? 'Done' : 'Edit'}
              </button>
            )}
            <button
              onClick={() => setImportOpen(true)}
              className="text-[11px] font-[450] px-4 py-2 rounded-[var(--radius-sm)] bg-[var(--c-gray-900)] text-white hover:bg-[var(--c-gray-800)] transition-colors"
            >
              Import XLSX
            </button>
          </div>
        </div>

        {engagements.length === 0 ? (
          <EmptyState
            title="No engagements yet"
            description="Import your first XLSX file to get started with engagement tracking."
            action={{ label: 'Import XLSX', onClick: () => setImportOpen(true) }}
          />
        ) : (
          <>
            {/* Summary cards */}
            <div className="mb-6">
              <div className="text-[28px] font-[300] text-[var(--c-gray-900)] mb-3">
                {formatEur(totalRevenue)}
                <span className="text-[13px] font-[400] text-[var(--c-gray-400)] ml-2">total revenue</span>
              </div>
              <div className="flex gap-6 text-[12px]">
                <span className="text-[var(--c-gray-600)]">
                  <strong className="font-[500]">{formatEur(thisYearRevenue)}</strong>
                  <span className="text-[var(--c-gray-400)] ml-1">{currentYear}</span>
                </span>
                <span className="text-[var(--c-gray-600)]">
                  <strong className="font-[500]">{clients.length}</strong>
                  <span className="text-[var(--c-gray-400)] ml-1">clients</span>
                </span>
                <span className="text-[var(--c-gray-600)]">
                  <strong className="font-[500]">{unlinkedCount}</strong>
                  <span className="text-[var(--c-gray-400)] ml-1">unlinked</span>
                </span>
              </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              {/* Year tabs */}
              <div className="flex gap-1">
                <button
                  onClick={() => setYearFilter(null)}
                  className={`text-[10px] font-[450] px-2.5 py-1.5 rounded-[var(--radius-sm)] transition-colors ${
                    !yearFilter ? 'bg-[var(--c-gray-900)] text-white' : 'text-[var(--c-gray-500)] hover:bg-[var(--c-gray-50)]'
                  }`}
                >
                  All
                </button>
                {years.map(y => (
                  <button
                    key={y}
                    onClick={() => setYearFilter(yearFilter === y ? null : y)}
                    className={`text-[10px] font-[450] px-2.5 py-1.5 rounded-[var(--radius-sm)] transition-colors ${
                      yearFilter === y ? 'bg-[var(--c-gray-900)] text-white' : 'text-[var(--c-gray-500)] hover:bg-[var(--c-gray-50)]'
                    }`}
                  >
                    {y}
                  </button>
                ))}
              </div>

              <div className="w-px h-4 bg-[var(--c-gray-200)]" />

              {/* Client dropdown */}
              <select
                value={clientFilter || ''}
                onChange={(e) => setClientFilter(e.target.value || null)}
                className="text-[11px] bg-white border border-[var(--c-gray-200)] rounded-[var(--radius-sm)] px-2.5 py-1.5 cursor-pointer"
              >
                <option value="">All clients</option>
                {clients.filter(c => c.engagementCount && c.engagementCount > 0).sort((a, b) => a.name.localeCompare(b.name)).map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              {/* Linked toggle */}
              <div className="flex gap-1">
                {(['all', 'linked', 'unlinked'] as const).map(v => (
                  <button
                    key={v}
                    onClick={() => setLinkedFilter(v)}
                    className={`text-[10px] font-[450] px-2.5 py-1.5 rounded-[var(--radius-sm)] transition-colors capitalize ${
                      linkedFilter === v ? 'bg-[var(--c-gray-900)] text-white' : 'text-[var(--c-gray-500)] hover:bg-[var(--c-gray-50)]'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>

              <span className="text-[10px] text-[var(--c-gray-400)] ml-auto">
                {filtered.length} of {engagements.length}
              </span>
            </div>

            {/* Table */}
            <div className="border border-[var(--c-gray-100)] rounded-[var(--radius-sm)] overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="bg-[var(--c-gray-50)] text-[var(--c-gray-500)]">
                    <th className="text-left px-3 py-2.5 font-[450] cursor-pointer hover:text-[var(--c-gray-700)]" onClick={() => handleSort('year')}>
                      Year {sortField === 'year' && (sortDir === 'desc' ? '↓' : '↑')}
                    </th>
                    <th className="text-left px-3 py-2.5 font-[450]">Project Name</th>
                    <th className="text-left px-3 py-2.5 font-[450] cursor-pointer hover:text-[var(--c-gray-700)]" onClick={() => handleSort('clientName')}>
                      Client {sortField === 'clientName' && (sortDir === 'desc' ? '↓' : '↑')}
                    </th>
                    <th className="text-right px-3 py-2.5 font-[450] cursor-pointer hover:text-[var(--c-gray-700)]" onClick={() => handleSort('amountEur')}>
                      EUR {sortField === 'amountEur' && (sortDir === 'desc' ? '↓' : '↑')}
                    </th>
                    <th className="text-right px-3 py-2.5 font-[450]">USD</th>
                    <th className="text-center px-3 py-2.5 font-[450]">Linked</th>
                    {editMode && <th className="px-3 py-2.5 w-8"></th>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((e) => (
                    <tr key={e.id} className="border-t border-[var(--c-gray-50)] hover:bg-[var(--c-gray-50)]/50 group">
                      <td className="px-3 py-1 w-16">
                        {editMode ? (
                          <InlineEditCell
                            value={e.year}
                            type="number"
                            onSave={(v) => handleUpdate(e.id, 'year', v)}
                          />
                        ) : (
                          <span className="text-[var(--c-gray-600)]">{e.year}</span>
                        )}
                      </td>
                      <td className="px-3 py-1">
                        {editMode ? (
                          <InlineEditCell
                            value={e.projectName}
                            onSave={(v) => handleUpdate(e.id, 'projectName', v)}
                          />
                        ) : (
                          <span className="text-[var(--c-gray-800)]">{e.projectName}</span>
                        )}
                      </td>
                      <td className="px-3 py-1">
                        {editMode ? (
                          <InlineEditCell
                            value={e.clientName || ''}
                            onSave={(v) => handleUpdate(e.id, 'clientName', v)}
                          />
                        ) : (
                          <span className="text-[var(--c-gray-600)]">{e.clientName || '—'}</span>
                        )}
                      </td>
                      <td className="px-3 py-1 text-right">
                        {editMode ? (
                          <InlineEditCell
                            value={e.amountEur}
                            type="number"
                            formatDisplay={(v) => formatEur(v as number | null)}
                            onSave={(v) => handleUpdate(e.id, 'amountEur', v)}
                            className="text-right"
                          />
                        ) : (
                          <span className="text-[var(--c-gray-600)] tabular-nums">{formatEur(e.amountEur)}</span>
                        )}
                      </td>
                      <td className="px-3 py-1 text-right">
                        {editMode ? (
                          <InlineEditCell
                            value={e.amountUsd}
                            type="number"
                            formatDisplay={(v) => formatUsd(v as number | null)}
                            onSave={(v) => handleUpdate(e.id, 'amountUsd', v)}
                            className="text-right"
                          />
                        ) : (
                          <span className="text-[var(--c-gray-500)] tabular-nums">{formatUsd(e.amountUsd)}</span>
                        )}
                      </td>
                      <td className="px-3 py-1 text-center">
                        <button
                          onClick={() => setLinkerEngagement(e)}
                          className="hover:bg-[var(--c-gray-100)] px-2 py-1 rounded transition-colors"
                          title="Link projects"
                        >
                          {(e.linkedProjectCount || 0) > 0 ? (
                            <span className="text-[10px] font-[500] px-1.5 py-0.5 rounded bg-green-100 text-green-700">
                              {e.linkedProjectCount}
                            </span>
                          ) : (
                            <span className="text-[10px] text-[var(--c-gray-300)] hover:text-[var(--c-gray-500)]">+ link</span>
                          )}
                        </button>
                      </td>
                      {editMode && (
                        <td className="px-3 py-1">
                          <button
                            onClick={async () => {
                              if (!confirm(`Delete "${e.projectName}" (${e.year})?`)) return
                              await api.deleteEngagement(e.id)
                              setEngagements(prev => prev.filter(eng => eng.id !== e.id))
                            }}
                            className="text-[var(--c-gray-300)] hover:text-[var(--c-error)] transition-colors"
                            title="Delete engagement"
                          >
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                              <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                            </svg>
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <RevenueBreakdown />
            <GapAnalysis />
          </>
        )}
      </div>

      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={loadData}
      />

      {linkerEngagement && (
        <ProjectLinker
          open={!!linkerEngagement}
          engagementId={linkerEngagement.id}
          clientName={linkerEngagement.clientName || ''}
          linkedProjectIds={[]}
          onClose={() => setLinkerEngagement(null)}
          onChanged={loadData}
        />
      )}
    </div>
  )
}
