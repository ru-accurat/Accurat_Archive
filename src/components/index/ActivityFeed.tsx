'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface ActivityEntry {
  id: string
  action: string
  createdAt: string
  projectId: string | null
  projectName: string | null
  client: string | null
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const diffMs = Date.now() - then
  const sec = Math.max(0, Math.floor(diffMs / 1000))
  if (sec < 60) return 'just now'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min} minute${min === 1 ? '' : 's'} ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} hour${hr === 1 ? '' : 's'} ago`
  const day = Math.floor(hr / 24)
  if (day < 30) return `${day} day${day === 1 ? '' : 's'} ago`
  const mo = Math.floor(day / 30)
  if (mo < 12) return `${mo} month${mo === 1 ? '' : 's'} ago`
  const yr = Math.floor(mo / 12)
  return `${yr} year${yr === 1 ? '' : 's'} ago`
}

function actionLabel(action: string): string {
  switch (action) {
    case 'project.created': return 'created'
    case 'project.updated': return 'edited'
    case 'project.deleted': return 'deleted'
    case 'media.uploaded': return 'uploaded media to'
    case 'media.deleted': return 'removed media from'
    case 'media.reordered': return 'reordered media in'
    case 'logo.uploaded': return 'added a logo to'
    case 'logo.deleted': return 'removed a logo from'
    case 'pdf.uploaded': return 'added a PDF to'
    case 'pdf.deleted': return 'removed a PDF from'
    case 'ai.generated': return 'generated content for'
    case 'tags.merged': return 'merged tags'
    case 'tags.renamed': return 'renamed tags'
    default: return action.replace(/[._]/g, ' ')
  }
}

export function ActivityFeed() {
  const [open, setOpen] = useState(false)
  const [entries, setEntries] = useState<ActivityEntry[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || entries !== null) return
    let cancelled = false
    setLoading(true)
    fetch('/api/activity/recent')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${r.status}`))))
      .then((data: ActivityEntry[]) => {
        if (!cancelled) setEntries(data)
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message || 'Failed to load')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, entries])

  return (
    <div className="px-4 sm:px-6 md:px-[48px] pt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 text-[11px] font-[450] px-2.5 py-1 rounded-full border border-[var(--c-gray-200)] text-[var(--c-gray-500)] hover:text-[var(--c-gray-900)] hover:bg-[var(--c-gray-50)] transition-colors"
        aria-expanded={open}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--c-gray-400)]" />
        Recent activity
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          className={`transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="mt-2 border border-[var(--c-gray-200)] rounded-[var(--radius-sm)] bg-white">
          {loading && (
            <div className="px-3 py-2 text-[11px] text-[var(--c-gray-400)]">Loading…</div>
          )}
          {error && !loading && (
            <div className="px-3 py-2 text-[11px] text-[var(--c-gray-500)]">Unable to load activity.</div>
          )}
          {!loading && !error && entries && entries.length === 0 && (
            <div className="px-3 py-2 text-[11px] text-[var(--c-gray-400)]">No recent activity.</div>
          )}
          {!loading && !error && entries && entries.length > 0 && (
            <ul className="divide-y divide-[var(--c-gray-100)]">
              {entries.map((e) => (
                <li key={e.id} className="px-3 py-1.5 text-[11px] font-[400] text-[var(--c-gray-600)] flex items-baseline gap-1.5">
                  <span className="text-[var(--c-gray-500)]">Someone</span>
                  <span>{actionLabel(e.action)}</span>
                  {e.projectId && e.projectName ? (
                    <Link
                      href={`/project/${e.projectId}`}
                      className="text-[var(--c-gray-900)] font-[500] hover:underline truncate"
                    >
                      {e.projectName}
                    </Link>
                  ) : e.projectName ? (
                    <span className="text-[var(--c-gray-700)] truncate">{e.projectName}</span>
                  ) : null}
                  <span className="ml-auto text-[var(--c-gray-400)] whitespace-nowrap">{relativeTime(e.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
