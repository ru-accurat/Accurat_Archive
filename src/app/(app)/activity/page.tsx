'use client'

import { useEffect, useState } from 'react'

interface ActivityEntry {
  id: string
  action: string
  project_id: string | null
  details: Record<string, unknown>
  created_at: string
}

const actionLabels: Record<string, string> = {
  'project.created': 'Created project',
  'project.updated': 'Updated project',
  'project.deleted': 'Deleted project',
  'media.uploaded': 'Uploaded media',
  'media.deleted': 'Deleted media',
  'media.reordered': 'Reordered media',
  'logo.uploaded': 'Uploaded logo',
  'logo.deleted': 'Deleted logo',
  'pdf.uploaded': 'Uploaded PDF',
  'pdf.deleted': 'Deleted PDF',
  'ai.generated': 'Generated with AI',
  'tags.merged': 'Merged tags',
  'tags.renamed': 'Renamed tag',
}

function formatTime(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function ActivityPage() {
  const [entries, setEntries] = useState<ActivityEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/activity?limit=100')
      .then((r) => r.json())
      .then((data) => {
        setEntries(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="h-full overflow-y-auto bg-[var(--c-white)]">
      <div className="max-w-[720px] px-4 sm:px-6 md:px-[48px] py-10">
        <h1 className="text-[1.4rem] font-[300] tracking-[-0.02em] text-[var(--c-gray-900)] mb-8">Activity</h1>

        {loading ? (
          <p className="text-[13px] text-[var(--c-gray-400)]">Loading...</p>
        ) : entries.length === 0 ? (
          <p className="text-[13px] text-[var(--c-gray-400)]">No activity yet.</p>
        ) : (
          <div className="flex flex-col">
            {entries.map((entry) => {
              const projectName = (entry.details?.projectName || entry.details?.project_name || entry.project_id || '') as string
              return (
                <div
                  key={entry.id}
                  className="flex items-start gap-4 py-3 border-b border-[var(--c-gray-100)] last:border-0"
                >
                  <div className="flex-1 min-w-0">
                    <span className="text-[13px] font-[450] text-[var(--c-gray-800)]">
                      {actionLabels[entry.action] || entry.action}
                    </span>
                    {projectName && (
                      <span className="text-[13px] text-[var(--c-gray-500)]">
                        {' '}&mdash; {projectName}
                      </span>
                    )}
                    {typeof entry.details?.field === 'string' && (
                      <span className="text-[12px] text-[var(--c-gray-400)] ml-1">
                        ({entry.details.field})
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-[var(--c-gray-400)] whitespace-nowrap shrink-0">
                    {formatTime(entry.created_at)}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
