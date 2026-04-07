'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { api } from '@/lib/api-client'
import { toast } from '@/lib/toast'
import type { ProjectSummary } from '@/lib/types'

interface ProjectLinkerProps {
  open: boolean
  engagementId: string
  clientName: string
  linkedProjectIds: string[]
  onClose: () => void
  onChanged: () => void
}

export function ProjectLinker({ open, engagementId, clientName, linkedProjectIds, onClose, onChanged }: ProjectLinkerProps) {
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [search, setSearch] = useState('')
  const [linked, setLinked] = useState<Set<string>>(new Set(linkedProjectIds))
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      api.getProjects().then(setProjects).catch((err) => toast.error('Failed to load projects: ' + String(err)))
      setLinked(new Set(linkedProjectIds))
      setSearch('')
    }
  }, [open, linkedProjectIds])

  const filtered = useMemo(() => {
    let result = projects
    // Show client-matched projects first
    if (search) {
      const lower = search.toLowerCase()
      result = result.filter(p =>
        p.client.toLowerCase().includes(lower) ||
        p.projectName.toLowerCase().includes(lower) ||
        p.fullName.toLowerCase().includes(lower)
      )
    }
    // Sort: linked first, then same-client, then rest
    return [...result].sort((a, b) => {
      const aLinked = linked.has(a.id) ? 0 : 1
      const bLinked = linked.has(b.id) ? 0 : 1
      if (aLinked !== bLinked) return aLinked - bLinked
      const aClient = a.client.toLowerCase() === clientName.toLowerCase() ? 0 : 1
      const bClient = b.client.toLowerCase() === clientName.toLowerCase() ? 0 : 1
      if (aClient !== bClient) return aClient - bClient
      return a.client.localeCompare(b.client)
    })
  }, [projects, search, linked, clientName])

  const handleToggle = useCallback(async (projectId: string) => {
    setSaving(true)
    try {
      if (linked.has(projectId)) {
        await api.unlinkEngagementProjects(engagementId, [projectId])
        setLinked(prev => { const n = new Set(prev); n.delete(projectId); return n })
      } else {
        await api.linkEngagementProjects(engagementId, [projectId])
        setLinked(prev => new Set(prev).add(projectId))
      }
      onChanged()
    } catch (err) {
      toast.error('Failed to update link: ' + String(err))
    }
    setSaving(false)
  }, [engagementId, linked, onChanged])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-[var(--c-white)] rounded-[var(--radius-md)] shadow-xl w-[90vw] max-w-[500px] max-h-[70vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--c-gray-100)]">
          <h3 className="text-[14px] font-[450] text-[var(--c-gray-900)]">Link Projects</h3>
          <button onClick={onClose} className="text-[var(--c-gray-400)] hover:text-[var(--c-gray-700)]">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>
          </button>
        </div>

        <div className="px-5 py-3 border-b border-[var(--c-gray-100)]">
          <input
            type="text"
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
            className="w-full text-[13px] px-3 py-2 bg-transparent border-b border-[var(--c-gray-200)] focus:border-[var(--c-gray-900)] focus:outline-none transition-colors"
          />
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-2">
          {filtered.slice(0, 50).map(p => {
            const isLinked = linked.has(p.id)
            const isClientMatch = p.client.toLowerCase() === clientName.toLowerCase()
            return (
              <button
                key={p.id}
                onClick={() => handleToggle(p.id)}
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
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-[450] text-[var(--c-gray-800)] truncate">
                    {p.client}
                    {isClientMatch && <span className="text-[9px] text-green-600 ml-1.5">same client</span>}
                  </div>
                  <div className="text-[11px] text-[var(--c-gray-500)] truncate">{p.projectName}</div>
                </div>
                {p.start && <span className="text-[10px] text-[var(--c-gray-400)] shrink-0">{p.start}</span>}
              </button>
            )
          })}
          {filtered.length > 50 && (
            <p className="text-[11px] text-[var(--c-gray-400)] text-center py-2">Showing first 50 — use search to narrow</p>
          )}
        </div>
      </div>
    </div>
  )
}
