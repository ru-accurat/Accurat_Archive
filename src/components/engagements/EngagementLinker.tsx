'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { api } from '@/lib/api-client'
import { toast } from '@/lib/toast'
import type { Engagement } from '@/lib/types'

interface EngagementLinkerProps {
  open: boolean
  projectId: string
  clientName: string
  linkedEngagementIds: string[]
  onClose: () => void
  onChanged: () => void
}

function formatEur(val: number | null): string {
  if (val == null) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val)
}

export function EngagementLinker({ open, projectId, clientName, linkedEngagementIds, onClose, onChanged }: EngagementLinkerProps) {
  const [engagements, setEngagements] = useState<Engagement[]>([])
  const [search, setSearch] = useState('')
  const [linked, setLinked] = useState<Set<string>>(new Set(linkedEngagementIds))
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      api.getEngagements().then(setEngagements).catch((err) => toast.error('Failed to load engagements: ' + String(err)))
      setLinked(new Set(linkedEngagementIds))
      setSearch('')
    }
  }, [open, linkedEngagementIds])

  const filtered = useMemo(() => {
    let result = engagements
    if (search) {
      const lower = search.toLowerCase()
      result = result.filter(e =>
        e.projectName.toLowerCase().includes(lower) ||
        (e.clientName || '').toLowerCase().includes(lower)
      )
    }
    // Sort: linked first, then same-client, then by year desc
    return [...result].sort((a, b) => {
      const aLinked = linked.has(a.id) ? 0 : 1
      const bLinked = linked.has(b.id) ? 0 : 1
      if (aLinked !== bLinked) return aLinked - bLinked
      const aClient = (a.clientName || '').toLowerCase() === clientName.toLowerCase() ? 0 : 1
      const bClient = (b.clientName || '').toLowerCase() === clientName.toLowerCase() ? 0 : 1
      if (aClient !== bClient) return aClient - bClient
      return b.year - a.year
    })
  }, [engagements, search, linked, clientName])

  const handleToggle = useCallback(async (engagementId: string) => {
    setSaving(true)
    try {
      if (linked.has(engagementId)) {
        await api.unlinkProjectEngagement(projectId, engagementId)
        setLinked(prev => { const n = new Set(prev); n.delete(engagementId); return n })
      } else {
        await api.linkProjectEngagements(projectId, [engagementId])
        setLinked(prev => new Set(prev).add(engagementId))
      }
      onChanged()
    } catch (err) {
      toast.error('Failed to update link: ' + String(err))
    }
    setSaving(false)
  }, [projectId, linked, onChanged])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-[var(--c-white)] rounded-[var(--radius-md)] shadow-xl w-[90vw] max-w-[550px] max-h-[70vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--c-gray-100)]">
          <h3 className="text-[14px] font-[450] text-[var(--c-gray-900)]">Link Engagements</h3>
          <button onClick={onClose} className="text-[var(--c-gray-400)] hover:text-[var(--c-gray-700)]">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>
          </button>
        </div>

        <div className="px-5 py-3 border-b border-[var(--c-gray-100)]">
          <input
            type="text"
            placeholder="Search engagements..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
            className="w-full text-[13px] px-3 py-2 bg-transparent border-b border-[var(--c-gray-200)] focus:border-[var(--c-gray-900)] focus:outline-none transition-colors"
          />
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-2">
          {filtered.slice(0, 80).map(e => {
            const isLinked = linked.has(e.id)
            const isClientMatch = (e.clientName || '').toLowerCase() === clientName.toLowerCase()
            return (
              <button
                key={e.id}
                onClick={() => handleToggle(e.id)}
                disabled={saving}
                className={`flex items-center gap-3 w-full text-left px-3 py-2 rounded-[var(--radius-sm)] transition-colors ${
                  isLinked ? 'bg-green-50' : 'hover:bg-[var(--c-gray-50)]'
                }`}
              >
                <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                  isLinked ? 'bg-green-600 border-green-600 text-white' : 'border-[var(--c-gray-300)]'
                }`}>
                  {isLinked && (
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                      <path d="M3 6l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <span className="text-[11px] text-[var(--c-gray-500)] shrink-0 w-10">{e.year}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-[450] text-[var(--c-gray-800)] truncate">
                    {e.clientName}
                    {isClientMatch && <span className="text-[9px] text-green-600 ml-1.5">same client</span>}
                  </div>
                  <div className="text-[11px] text-[var(--c-gray-500)] truncate">{e.projectName}</div>
                </div>
                <span className="text-[11px] text-[var(--c-gray-500)] tabular-nums shrink-0">{formatEur(e.amountEur)}</span>
              </button>
            )
          })}
          {filtered.length > 80 && (
            <p className="text-[11px] text-[var(--c-gray-400)] text-center py-2">Showing first 80 — use search to narrow</p>
          )}
        </div>
      </div>
    </div>
  )
}
