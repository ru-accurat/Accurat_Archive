'use client'

import { useState } from 'react'
import type { Category, Offering, Project } from '@/lib/types'
import { OFFERINGS, OFFERING_LABELS } from '@/lib/types'
import { WebsiteCell, WebsitePanel, type WebsitePanelMode } from './WebsiteControl'

interface Props {
  project: Project
  categories: Category[]
  /** Saves one field. Omit for read-only. */
  onUpdate?: (field: keyof Project, value: unknown) => void | Promise<void>
  /** Puts the project on the website, changes its Library number, or (null) removes it.
   *  Saves immediately, so omit it where edits are drafts (Edit mode). Resolves true on success. */
  onSetWebsiteNumber?: (deckNo: number | null) => Promise<boolean>
  dark?: boolean
}

/**
 * Deck consolidation facts: website listing (Library number), category, offerings, ongoing and hero video.
 * Used in the dark view-mode header and, with dark=false, in Edit mode.
 */
export function ProjectDeckFacts({ project, categories, onUpdate, onSetWebsiteNumber, dark = false }: Props) {
  const [websitePanel, setWebsitePanel] = useState<WebsitePanelMode>(null)
  const label = dark ? 'text-white/40' : 'text-[var(--c-gray-400)]'
  const value = dark ? 'text-white/80' : 'text-[var(--c-gray-800)]'
  const muted = dark ? 'text-white/40' : 'text-[var(--c-gray-400)]'
  const chipOff = dark
    ? 'border-white/15 text-white/50 hover:border-white/40 hover:text-white/80'
    : 'border-[var(--c-gray-200)] text-[var(--c-gray-500)] hover:border-[var(--c-gray-400)]'
  const chipOn = dark ? 'border-white bg-white text-[var(--c-gray-900)]' : 'border-[var(--c-gray-900)] bg-[var(--c-gray-900)] text-white'
  const offerings = project.offerings || []
  const editable = !!onUpdate

  const toggleOffering = (o: Offering) => {
    if (!onUpdate) return
    const next = offerings.includes(o) ? offerings.filter((x) => x !== o) : [...offerings, o]
    onUpdate('offerings', next)
  }
  const makeMain = (o: Offering) => {
    if (!onUpdate || offerings[0] === o) return
    onUpdate('offerings', [o, ...offerings.filter((x) => x !== o)])
  }

  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[auto_minmax(0,1.6fr)_minmax(0,2fr)_auto] gap-x-8 gap-y-4 text-[12px]">
      <WebsiteCell
        project={project}
        dark={dark}
        onOpen={onSetWebsiteNumber ? setWebsitePanel : undefined}
        onRemove={onSetWebsiteNumber ? () => {
          const name = `${project.client} - ${project.projectName}`
          if (confirm(`Remove ${name} from the website?\n\nIts Library number ${String(project.deckNo).padStart(3, '0')} becomes free. Media roles, hero and thumbnail stay as they are, so you can put it back later. The change is logged.`)) {
            void onSetWebsiteNumber(null)
          }
        } : undefined}
      />

      <div>
        <dt className={`text-[10px] font-[500] uppercase tracking-[0.1em] mb-1.5 ${label}`}>
          <label htmlFor={`category-${project.id}`}>Category</label>
        </dt>
        <dd>
          {editable ? (
            <div className="relative z-10">
              <select
                id={`category-${project.id}`}
                value={project.categoryId ?? ''}
                onChange={(e) => onUpdate!('categoryId', e.target.value ? Number(e.target.value) : null)}
                className={`w-full min-h-[28px] cursor-pointer rounded-[var(--radius-sm)] border px-2 py-1 text-[12px] outline-none ${
                  dark
                    ? 'bg-[var(--c-gray-900)] border-white/15 text-white/80 focus:border-white/50'
                    : 'bg-white border-[var(--c-gray-200)] text-[var(--c-gray-800)] focus:border-[var(--c-gray-900)]'
                }`}
              >
                <option value="">No category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{String(c.number).padStart(2, '0')} {c.name}</option>
                ))}
              </select>
            </div>
          ) : (
            <span className={value}>{categories.find((c) => c.id === project.categoryId)?.name || '—'}</span>
          )}
        </dd>
      </div>

      <div>
        <dt className={`text-[10px] font-[500] uppercase tracking-[0.1em] mb-1.5 ${label}`}>
          Offerings <span className="normal-case tracking-normal font-[400]">(first is main)</span>
        </dt>
        <dd className="flex flex-wrap gap-1.5">
          {OFFERINGS.map((o) => {
            const idx = offerings.indexOf(o)
            const on = idx >= 0
            return (
              <span key={o} className="inline-flex">
                <button
                  type="button"
                  disabled={!editable}
                  aria-pressed={on}
                  onClick={() => toggleOffering(o)}
                  className={`min-h-[26px] rounded-full border px-2.5 text-[11px] transition-colors disabled:cursor-default ${on ? chipOn : chipOff} ${!editable && !on ? 'hidden' : ''}`}
                >
                  {on && <span className="tabular-nums mr-1 opacity-60">{idx + 1}</span>}
                  {OFFERING_LABELS[o]}
                </button>
                {editable && on && idx > 0 && (
                  <button
                    type="button"
                    onClick={() => makeMain(o)}
                    className={`ml-0.5 min-h-[26px] px-1.5 text-[10px] underline-offset-2 hover:underline ${muted}`}
                    title={`Make ${OFFERING_LABELS[o]} the main offering`}
                  >
                    main
                  </button>
                )}
              </span>
            )
          })}
          {!editable && offerings.length === 0 && <span className={muted}>None</span>}
        </dd>
      </div>

      <div>
        <dt className={`text-[10px] font-[500] uppercase tracking-[0.1em] mb-1.5 ${label}`}>
          <label htmlFor={`ongoing-${project.id}`}>Ongoing</label>
        </dt>
        <dd className="flex items-center gap-2 min-h-[26px]">
          <input
            id={`ongoing-${project.id}`}
            type="checkbox"
            checked={!!project.ongoing}
            disabled={!editable}
            onChange={(e) => onUpdate?.('ongoing', e.target.checked)}
            className="w-4 h-4 cursor-pointer accent-[var(--c-gray-900)] disabled:cursor-default"
          />
          <span className={muted}>{project.ongoing ? 'Today (no end year)' : 'Ended'}</span>
        </dd>
      </div>

      {websitePanel && onSetWebsiteNumber && (
        <WebsitePanel
          project={project}
          mode={websitePanel}
          dark={dark}
          onClose={() => setWebsitePanel(null)}
          onSubmit={(n) => onSetWebsiteNumber(n)}
        />
      )}

      {project.heroVideo && (
        <div className="sm:col-span-2 lg:col-span-4">
          <dt className={`text-[10px] font-[500] uppercase tracking-[0.1em] mb-1.5 ${label}`}>Hero video</dt>
          <dd className={`${value} break-all`} title="The opener video. The hero image is its first frame.">{project.heroVideo}</dd>
        </div>
      )}
    </dl>
  )
}
