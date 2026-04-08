'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { api } from '@/lib/api-client'
import { toast } from '@/lib/toast'
import type { Engagement, ProjectSummary } from '@/lib/types'

interface BatchLinkerProps {
  open: boolean
  clientId: string
  clientName: string
  onClose: () => void
  onChanged: () => void
}

function formatEur(val: number | null | undefined): string {
  if (val == null) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val)
}

export function BatchLinker({ open, clientId, clientName, onClose, onChanged }: BatchLinkerProps) {
  const [engagements, setEngagements] = useState<Engagement[]>([])
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [selectedEng, setSelectedEng] = useState<Set<string>>(new Set())
  const [selectedProj, setSelectedProj] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open || !clientId) return
    setLoading(true)
    setSelectedEng(new Set())
    setSelectedProj(new Set())
    Promise.all([
      api.getEngagements({ clientId, linked: false }),
      api.getProjects(),
    ])
      .then(([engs, projs]) => {
        setEngagements(engs)
        setProjects(projs)
      })
      .catch(err => toast.error('Failed to load: ' + String(err)))
      .finally(() => setLoading(false))
  }, [open, clientId])

  const clientProjects = useMemo(
    () => projects.filter(p => p.client === clientName).sort((a, b) => (b.start || 0) - (a.start || 0)),
    [projects, clientName]
  )

  const toggleEng = (id: string) => {
    setSelectedEng(prev => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }
  const toggleProj = (id: string) => {
    setSelectedProj(prev => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  const handleLink = useCallback(async () => {
    if (selectedEng.size === 0 || selectedProj.size === 0) {
      toast.error('Select at least one engagement and one project')
      return
    }
    setSaving(true)
    try {
      const projIds = Array.from(selectedProj)
      let linked = 0
      for (const engId of selectedEng) {
        await api.linkEngagementProjects(engId, projIds)
        linked++
      }
      toast.success(`Linked ${linked} engagement${linked !== 1 ? 's' : ''} to ${projIds.length} project${projIds.length !== 1 ? 's' : ''}`)
      onChanged()
      onClose()
    } catch (err) {
      toast.error('Batch link failed: ' + String(err))
    }
    setSaving(false)
  }, [selectedEng, selectedProj, onChanged, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-[var(--c-white)] rounded-[var(--radius-md)] shadow-xl w-[90vw] max-w-[900px] max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--c-gray-100)]">
          <div>
            <h2 className="text-[16px] font-[450] text-[var(--c-gray-900)]">Batch link: {clientName}</h2>
            <p className="text-[11px] text-[var(--c-gray-400)] mt-0.5">Select unlinked engagements and case studies, then link them all at once.</p>
          </div>
          <button onClick={onClose} className="text-[var(--c-gray-400)] hover:text-[var(--c-gray-700)] transition-colors">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-hidden grid grid-cols-2 gap-4 px-6 py-4">
          {/* Engagements column */}
          <div className="flex flex-col min-h-0">
            <div className="text-[11px] font-[500] text-[var(--c-gray-500)] mb-2 uppercase tracking-wide">
              Unlinked engagements ({engagements.length})
            </div>
            <div className="flex-1 overflow-y-auto border border-[var(--c-gray-100)] rounded-[var(--radius-sm)]">
              {loading ? (
                <div className="p-4 text-[12px] text-[var(--c-gray-400)]">Loading...</div>
              ) : engagements.length === 0 ? (
                <div className="p-4 text-[12px] text-[var(--c-gray-400)] italic">No unlinked engagements for this client.</div>
              ) : (
                engagements.map(e => (
                  <label key={e.id} className="flex items-start gap-2 px-3 py-2 border-b border-[var(--c-gray-50)] last:border-b-0 hover:bg-[var(--c-gray-50)] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedEng.has(e.id)}
                      onChange={() => toggleEng(e.id)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] text-[var(--c-gray-800)] truncate">
                        <span className="text-[var(--c-gray-400)] mr-1.5">{e.year}</span>
                        {e.projectName}
                      </div>
                      <div className="text-[10px] text-[var(--c-gray-500)] tabular-nums">{formatEur(e.amountEur)}</div>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Projects column */}
          <div className="flex flex-col min-h-0">
            <div className="text-[11px] font-[500] text-[var(--c-gray-500)] mb-2 uppercase tracking-wide">
              Case studies ({clientProjects.length})
            </div>
            <div className="flex-1 overflow-y-auto border border-[var(--c-gray-100)] rounded-[var(--radius-sm)]">
              {loading ? (
                <div className="p-4 text-[12px] text-[var(--c-gray-400)]">Loading...</div>
              ) : clientProjects.length === 0 ? (
                <div className="p-4 text-[12px] text-[var(--c-gray-400)] italic">No case studies for this client.</div>
              ) : (
                clientProjects.map(p => (
                  <label key={p.id} className="flex items-start gap-2 px-3 py-2 border-b border-[var(--c-gray-50)] last:border-b-0 hover:bg-[var(--c-gray-50)] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedProj.has(p.id)}
                      onChange={() => toggleProj(p.id)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] text-[var(--c-gray-800)] truncate">
                        <span className="text-[var(--c-gray-400)] mr-1.5">
                          {p.start ?? '?'}
                          {p.end && p.end !== p.start ? `–${p.end}` : ''}
                        </span>
                        {p.projectName}
                      </div>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-[var(--c-gray-100)]">
          <div className="text-[11px] text-[var(--c-gray-500)]">
            {selectedEng.size} engagement{selectedEng.size !== 1 ? 's' : ''} × {selectedProj.size} project{selectedProj.size !== 1 ? 's' : ''} = {selectedEng.size * selectedProj.size} links
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="text-[12px] text-[var(--c-gray-500)] hover:text-[var(--c-gray-700)] transition-colors px-3 py-1.5">
              Cancel
            </button>
            <button
              onClick={handleLink}
              disabled={saving || selectedEng.size === 0 || selectedProj.size === 0}
              className="text-[12px] font-[450] px-4 py-2 rounded-[var(--radius-sm)] bg-[var(--c-gray-900)] text-white hover:bg-[var(--c-gray-800)] transition-colors disabled:opacity-50"
            >
              {saving ? 'Linking...' : 'Link selected'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
