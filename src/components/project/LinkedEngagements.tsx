'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api-client'
import { toast } from '@/lib/toast'
import { EngagementLinker } from '@/components/engagements/EngagementLinker'
import type { Engagement } from '@/lib/types'
import { useAuth } from '@/hooks/use-auth'
import { canSeeBusiness } from '@/lib/auth'

function formatEur(val: number | null): string {
  if (val == null) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val)
}

interface LinkedEngagementsProps {
  projectId: string
  clientName: string
}

export function LinkedEngagements({ projectId, clientName }: LinkedEngagementsProps) {
  const { profile } = useAuth()
  const [engagements, setEngagements] = useState<Engagement[]>([])
  const [loading, setLoading] = useState(true)
  const [linkerOpen, setLinkerOpen] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await api.getProjectEngagements(projectId)
      setEngagements(data)
    } catch (err) {
      toast.error('Failed to load engagements: ' + String(err))
    }
    setLoading(false)
  }, [projectId])

  useEffect(() => { load() }, [load])

  const totalRevenue = engagements.reduce((sum, e) => sum + (e.amountEur || 0), 0)

  if (loading) return null
  // content_reader never sees engagement connections on the project page
  if (!canSeeBusiness(profile?.role)) return null

  return (
    <div className="mt-16">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[13px] font-[500] uppercase tracking-[0.08em] text-[var(--c-gray-400)]">
          Engagements
          {engagements.length > 0 && (
            <span className="ml-2 text-[var(--c-gray-600)] normal-case tracking-normal font-[400]">
              {formatEur(totalRevenue)} total
            </span>
          )}
        </h2>
        <button
          onClick={() => setLinkerOpen(true)}
          className="text-[11px] font-[400] text-[var(--c-gray-400)] hover:text-[var(--c-gray-700)] transition-colors"
        >
          + Link
        </button>
      </div>

      {engagements.length === 0 ? (
        <p className="text-[12px] text-[var(--c-gray-400)]">
          No engagements linked.{' '}
          <button onClick={() => setLinkerOpen(true)} className="text-[var(--c-gray-600)] hover:text-[var(--c-gray-900)] underline">
            Link one
          </button>
        </p>
      ) : (
        <div className="flex flex-col gap-1">
          {engagements.map(e => (
            <div key={e.id} className="flex items-center gap-4 py-2 px-3 rounded-[var(--radius-sm)] hover:bg-[var(--c-gray-50)] group">
              <span className="text-[11px] text-[var(--c-gray-500)] w-10 shrink-0">{e.year}</span>
              <span className="text-[12px] text-[var(--c-gray-800)] flex-1 truncate">{e.projectName}</span>
              <span className="text-[11px] text-[var(--c-gray-600)] tabular-nums shrink-0">{formatEur(e.amountEur)}</span>
              <button
                onClick={async () => {
                  try {
                    await api.unlinkProjectEngagement(projectId, e.id)
                    load()
                    toast.success('Engagement unlinked')
                  } catch (err) {
                    toast.error('Unlink failed: ' + String(err))
                  }
                }}
                className="text-[var(--c-gray-300)] hover:text-[var(--c-error)] transition-colors opacity-0 group-hover:opacity-100"
                title="Unlink"
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2.5 2.5l5 5M7.5 2.5l-5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      <EngagementLinker
        open={linkerOpen}
        projectId={projectId}
        clientName={clientName}
        linkedEngagementIds={engagements.map(e => e.id)}
        onClose={() => setLinkerOpen(false)}
        onChanged={load}
      />
    </div>
  )
}
