'use client'

import { useEffect, useState } from 'react'
import type { Project } from '@/lib/types'
import { api } from '@/lib/api-client'
import { ON_WEBSITE, STATUS_LABELS } from '@/lib/status'

const pad = (n: number) => String(n).padStart(3, '0')

interface CellProps {
  project: Project
  dark: boolean
  /** Opens the Library number editor. Omit for read-only. */
  onChangeNumber?: () => void
}

/**
 * The "Website" fact. Status decides the website (Public, or Private as confidential);
 * this shows the result and the project's Library number, reserved when it is off the website.
 */
export function WebsiteCell({ project, dark, onChangeNumber }: CellProps) {
  const label = dark ? 'text-white/40' : 'text-[var(--c-gray-400)]'
  const value = dark ? 'text-white/80' : 'text-[var(--c-gray-800)]'
  const muted = dark ? 'text-white/40' : 'text-[var(--c-gray-400)]'
  const link = `min-h-[24px] text-[11px] underline-offset-2 hover:underline ${dark ? 'text-white/60 hover:text-white' : 'text-[var(--c-gray-600)] hover:text-[var(--c-gray-900)]'}`
  const on = ON_WEBSITE.has(project.status) && project.deckNo != null
  const state = !on ? 'Not on the website' : project.status === 'private' ? 'Confidential' : 'Live'

  return (
    <div>
      <dt className={`text-[10px] font-[500] uppercase tracking-[0.1em] mb-1.5 ${label}`}>Website</dt>
      <dd title="Status decides the website: Public projects are on it, Private ones as confidential. Draft and Archive only are not.">
        <span className={`inline-flex items-center gap-1.5 ${on ? value : muted}`}>
          {on && (
            <span
              aria-hidden
              className="inline-block w-1.5 h-1.5 rounded-full"
              style={{ background: project.status === 'public' ? 'var(--c-success)' : 'var(--c-warning)' }}
            />
          )}
          {state}
        </span>
        {project.deckNo != null && (
          <div className={`mt-0.5 tabular-nums ${on ? value : muted}`}>
            Library {pad(project.deckNo)}{!on && ' (reserved)'}
          </div>
        )}
        {!on && (
          <div className={`mt-0.5 text-[11px] ${muted}`}>
            {STATUS_LABELS[project.status]}: set the status to Public or Private to put it on.
          </div>
        )}
        {onChangeNumber && project.deckNo != null && (
          <div className="mt-1">
            <button type="button" className={link} onClick={onChangeNumber}>Change number</button>
          </div>
        )}
      </dd>
    </div>
  )
}

interface PanelProps {
  project: Project
  dark: boolean
  onClose: () => void
  /** Resolves true when the change was saved. */
  onSubmit: (deckNo: number) => Promise<boolean>
}

/** Full-width panel under the facts: change the Library number. */
export function WebsitePanel({ project, dark, onClose, onSubmit }: PanelProps) {
  const [number, setNumber] = useState(String(project.deckNo ?? ''))
  const [nextFree, setNextFree] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    api.getWebsiteStatus(project.id).then((s) => { if (!cancelled) setNextFree(s.nextFree) }).catch(() => {})
    return () => { cancelled = true }
  }, [project.id])

  const box = dark ? 'border-white/15 bg-white/[0.03]' : 'border-[var(--c-gray-200)] bg-[var(--c-gray-50)]'
  const muted = dark ? 'text-white/50' : 'text-[var(--c-gray-500)]'
  const input = dark
    ? 'bg-[var(--c-gray-900)] border-white/15 text-white/90 focus:border-white/50'
    : 'bg-white border-[var(--c-gray-200)] text-[var(--c-gray-800)] focus:border-[var(--c-gray-900)]'
  const primary = dark ? 'bg-white text-[var(--c-gray-900)] hover:bg-white/90' : 'bg-[var(--c-gray-900)] text-white hover:bg-[var(--c-gray-800)]'
  const secondary = dark ? 'text-white/60 hover:text-white' : 'text-[var(--c-gray-600)] hover:text-[var(--c-gray-900)]'

  const parsed = Number(number)
  const valid = Number.isInteger(parsed) && parsed >= 1 && parsed <= 999 && parsed !== project.deckNo
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid || saving) return
    setSaving(true)
    const ok = await onSubmit(parsed)
    setSaving(false)
    if (ok) onClose()
  }

  return (
    <div className="sm:col-span-2 lg:col-span-4">
      <form onSubmit={submit} className={`rounded-[var(--radius-md)] border px-4 py-3.5 text-[12px] ${box}`}>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className={`text-[10px] font-[500] uppercase tracking-[0.1em] ${muted}`}>Library number</span>
            <input
              type="number"
              min={1}
              max={999}
              step={1}
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              className={`w-24 min-h-[30px] rounded-[var(--radius-sm)] border px-2 tabular-nums outline-none ${input}`}
              autoFocus
            />
          </label>
          <button
            type="submit"
            disabled={!valid || saving}
            className={`min-h-[30px] rounded-[var(--radius-sm)] px-3 text-[11px] font-[500] transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${primary}`}
          >
            {saving ? 'Saving…' : 'Save number'}
          </button>
          <button type="button" onClick={onClose} className={`min-h-[30px] px-1 text-[11px] ${secondary}`}>Cancel</button>
        </div>
        <p className={`mt-2 text-[11px] ${muted}`}>
          Numbers are unique{nextFree != null ? `; the next free one is ${pad(nextFree)}` : ''}. The website refreshes automatically.
        </p>
      </form>
    </div>
  )
}
