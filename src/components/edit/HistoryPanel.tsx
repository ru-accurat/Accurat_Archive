'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api-client'
import type { HistoryEntry } from '@/lib/types'

interface Props {
  projectId: string
  onRestore: (entry: HistoryEntry) => void
}

export function HistoryPanel({ projectId, onRestore }: Props) {
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const entries = await api.getProjectHistory(projectId)
        setHistory(entries)
      } catch (err) {
        console.error('Failed to load history:', err)
      }
      setLoading(false)
    }
    load()
  }, [projectId])

  if (loading) return null
  if (history.length === 0) {
    return (
      <div className="text-[11px] text-[var(--c-gray-400)] font-[400] py-4">
        No edit history yet
      </div>
    )
  }

  const formatTimestamp = (ts: string) => {
    const cleaned = ts.replace(/(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2}).*/, '$1 $2:$3:$4')
    try {
      const d = new Date(cleaned)
      return d.toLocaleString()
    } catch {
      return ts
    }
  }

  const shown = expanded ? history : history.slice(0, 5)

  return (
    <div className="py-8 mt-4 border-t border-[var(--c-gray-200)]">
      <h3 className="text-[10px] font-[500] uppercase tracking-[0.1em] text-[var(--c-gray-400)] mb-4">
        Edit History ({history.length} versions)
      </h3>
      <div className="flex flex-col gap-1">
        {shown.map((entry, i) => (
          <div
            key={entry.timestamp}
            className="flex items-center justify-between py-2.5 px-0 text-[12px]"
          >
            <span className="text-[var(--c-gray-500)] font-[400]">
              {formatTimestamp(entry.timestamp)}
              {i === 0 && <span className="ml-2 text-[var(--c-gray-300)] font-[350]">(latest)</span>}
            </span>
            <button
              onClick={() => onRestore(entry)}
              className="text-[var(--c-gray-400)] hover:text-[var(--c-gray-900)] font-[450] transition-colors duration-200"
            >
              Restore
            </button>
          </div>
        ))}
      </div>
      {history.length > 5 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-[12px] font-[450] text-[var(--c-gray-400)] hover:text-[var(--c-gray-900)] mt-3 transition-colors duration-200"
        >
          {expanded ? 'Show less' : `Show all ${history.length} versions`}
        </button>
      )}
    </div>
  )
}
