'use client'

import { useEffect, useState } from 'react'
import type { Project, WebsiteStatus } from '@/lib/types'
import { api } from '@/lib/api-client'

export type WebsitePanelMode = 'add' | 'change' | null

const pad = (n: number) => String(n).padStart(3, '0')
const STATUS_LABEL: Record<Project['status'], string> = { draft: 'Draft', internal: 'Internal', public: 'Public' }

interface CellProps {
  project: Project
  dark: boolean
  /** Omit for read-only. */
  onOpen?: (mode: Exclude<WebsitePanelMode, null>) => void
  onRemove?: () => void
}

/** The "Website" fact: whether the project is listed, its Library number, and the controls. */
export function WebsiteCell({ project, dark, onOpen, onRemove }: CellProps) {
  const label = dark ? 'text-white/40' : 'text-[var(--c-gray-400)]'
  const value = dark ? 'text-white/80' : 'text-[var(--c-gray-800)]'
  const muted = dark ? 'text-white/40' : 'text-[var(--c-gray-400)]'
  const link = `min-h-[24px] text-[11px] underline-offset-2 hover:underline ${dark ? 'text-white/60 hover:text-white' : 'text-[var(--c-gray-600)] hover:text-[var(--c-gray-900)]'}`
  const on = project.deckNo != null
  const live = on && project.status === 'public'

  return (
    <div>
      <dt className={`text-[10px] font-[500] uppercase tracking-[0.1em] mb-1.5 ${label}`}>Website</dt>
      <dd title="The website lists a project when it has a Library number (deck_no) and its status is Public.">
        {!on && <span className={muted}>Not on the website</span>}
        {on && (
          <span className={`inline-flex items-center gap-1.5 tabular-nums ${value}`}>
            <span
              aria-hidden
              className="inline-block w-1.5 h-1.5 rounded-full"
              style={{ background: live ? 'var(--c-success)' : 'var(--c-warning)' }}
            />
            {live ? 'Live' : 'Hidden'} · Library {pad(project.deckNo!)}
          </span>
        )}
        {on && !live && (
          <div className={`mt-1 text-[11px] ${muted}`}>
            Status is {STATUS_LABEL[project.status]}: set it to Public to show it.
          </div>
        )}
        {onOpen && (
          <div className="mt-1 flex flex-wrap gap-x-3">
            {!on && <button type="button" className={link} onClick={() => onOpen('add')}>Put on website…</button>}
            {on && <button type="button" className={link} onClick={() => onOpen('change')}>Change number</button>}
            {on && onRemove && <button type="button" className={link} onClick={onRemove}>Remove</button>}
          </div>
        )}
      </dd>
    </div>
  )
}

interface PanelProps {
  project: Project
  mode: Exclude<WebsitePanelMode, null>
  dark: boolean
  onClose: () => void
  /** Resolves true when the change was saved. */
  onSubmit: (deckNo: number) => Promise<boolean>
}

/** Full-width panel under the facts: readiness checks and the Library number to use. */
export function WebsitePanel({ project, mode, dark, onClose, onSubmit }: PanelProps) {
  const [status, setStatus] = useState<WebsiteStatus | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [number, setNumber] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    api.getWebsiteStatus(project.id)
      .then((s) => {
        if (cancelled) return
        setStatus(s)
        setNumber(String(mode === 'change' && s.deckNo != null ? s.deckNo : s.nextFree))
      })
      .catch((e) => { if (!cancelled) setLoadError(e instanceof Error ? e.message : String(e)) })
    return () => { cancelled = true }
  }, [project.id, mode])

  const box = dark ? 'border-white/15 bg-white/[0.03]' : 'border-[var(--c-gray-200)] bg-[var(--c-gray-50)]'
  const text = dark ? 'text-white/80' : 'text-[var(--c-gray-800)]'
  const muted = dark ? 'text-white/50' : 'text-[var(--c-gray-500)]'
  const input = dark
    ? 'bg-[var(--c-gray-900)] border-white/15 text-white/90 focus:border-white/50'
    : 'bg-white border-[var(--c-gray-200)] text-[var(--c-gray-800)] focus:border-[var(--c-gray-900)]'
  const primary = dark ? 'bg-white text-[var(--c-gray-900)] hover:bg-white/90' : 'bg-[var(--c-gray-900)] text-white hover:bg-[var(--c-gray-800)]'
  const secondary = dark ? 'text-white/60 hover:text-white' : 'text-[var(--c-gray-600)] hover:text-[var(--c-gray-900)]'

  const missing = mode === 'add' ? (status?.checks || []).filter((c) => !c.ok) : []
  const parsed = Number(number)
  const validNumber = Number.isInteger(parsed) && parsed >= 1 && parsed <= 999
  const unchanged = mode === 'change' && parsed === project.deckNo
  const canSubmit = !!status && missing.length === 0 && validNumber && !unchanged && !saving

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setSaving(true)
    const ok = await onSubmit(parsed)
    setSaving(false)
    if (ok) onClose()
  }

  return (
    <div className="sm:col-span-2 lg:col-span-4">
      <form onSubmit={submit} className={`rounded-[var(--radius-md)] border px-4 py-3.5 text-[12px] ${box}`}>
        <div className={`mb-3 text-[10px] font-[500] uppercase tracking-[0.1em] ${muted}`}>
          {mode === 'add' ? 'Put on the website' : 'Change the Library number'}
        </div>

        {!status && !loadError && <p className={muted}>Checking…</p>}
        {loadError && <p className="text-[var(--c-error)]">Could not check this project: {loadError}</p>}

        {status && mode === 'add' && (
          <ul className="mb-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
            {status.checks.map((c) => (
              <li key={c.key} className="flex items-center gap-2">
                <span aria-hidden className="w-3 text-center" style={{ color: c.ok ? 'var(--c-success)' : 'var(--c-error)' }}>{c.ok ? '✓' : '✗'}</span>
                <span className={c.ok ? muted : text}>{c.label}<span className="sr-only">{c.ok ? ': done' : ': missing'}</span></span>
              </li>
            ))}
          </ul>
        )}
        {status && missing.length > 0 && (
          <p className={`mb-3 ${text}`}>
            Fix the missing items first. Mark files as selected and set the hero and thumbnail in Media below.
          </p>
        )}

        {status && missing.length === 0 && (
          <>
            {mode === 'add' && project.status !== 'public' && (
              <p className={`mb-3 ${text}`}>
                Status is {STATUS_LABEL[project.status]}, so it gets a Library number but stays hidden until the status is Public.
              </p>
            )}
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
                disabled={!canSubmit}
                className={`min-h-[30px] rounded-[var(--radius-sm)] px-3 text-[11px] font-[500] transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${primary}`}
              >
                {saving ? 'Saving…' : mode === 'add' ? 'Put on website' : 'Save number'}
              </button>
              <button type="button" onClick={onClose} className={`min-h-[30px] px-1 text-[11px] ${secondary}`}>Cancel</button>
            </div>
            <p className={`mt-2 text-[11px] ${muted}`}>
              {mode === 'add'
                ? `Next free number: ${pad(status.nextFree)}. Numbers must be unique.`
                : 'Numbers must be unique. The website refreshes automatically.'}
            </p>
          </>
        )}

        {(loadError || (status && missing.length > 0)) && (
          <button type="button" onClick={onClose} className={`min-h-[30px] px-1 text-[11px] ${secondary}`}>Close</button>
        )}
      </form>
    </div>
  )
}
