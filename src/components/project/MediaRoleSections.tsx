'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import Image from 'next/image'
import type { MediaFile, MediaRole } from '@/lib/types'
import { isVideo } from '@/lib/format'

interface Props {
  media: MediaFile[]
  /** Website project (deck_no set): role changes and hero/thumbnail reach the website. */
  onWebsite: boolean
  heroFilename?: string | null
  thumbFilename?: string | null
  /** Editing callbacks; omit all for read-only. */
  onSetRole?: (ids: string[], role: 'selected' | 'backup') => Promise<boolean>
  onSetSpecial?: (file: MediaFile, kind: 'hero' | 'thumbnail') => Promise<void>
  onSaveCaption?: (file: MediaFile, caption: string) => Promise<void>
  onDeleteMedia?: (filename: string) => void
  onAddMedia?: () => void
}

type Group = { key: MediaRole | 'other'; title: string; note: string; items: MediaFile[] }

const sectionTitle = 'text-[10px] font-[500] uppercase tracking-[0.1em] text-[var(--c-gray-400)]'

/** Why a file has no checkbox, or null when it can be ticked. */
function selectBlock(m: MediaFile): string | null {
  if (!m.mediaId) return 'No media record'
  if (m.role === 'inuse') return 'In-use mockups stay in-use'
  if (m.role === 'backup') return m.promoteBlock || null
  if (m.role === 'selected' && (m.isHero || m.isThumbnail)) return 'Hero or thumbnail: choose another one first'
  return null
}

export function MediaRoleSections({
  media, onWebsite, heroFilename, thumbFilename,
  onSetRole, onSetSpecial, onSaveCaption, onDeleteMedia, onAddMedia,
}: Props) {
  const editable = !!onSetRole
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [lightbox, setLightbox] = useState<{ items: MediaFile[]; index: number } | null>(null)

  const hasFlags = media.some((m) => m.isHero || m.isThumbnail)
  const isHero = (m: MediaFile) => (hasFlags ? !!m.isHero : m.filename === heroFilename)
  const isThumb = (m: MediaFile) => (hasFlags ? !!m.isThumbnail : m.filename === thumbFilename)

  const groups: Group[] = useMemo(() => {
    const by = (r: MediaRole | undefined) => media.filter((m) => m.role === r)
    return [
      { key: 'selected' as const, title: 'Selected', note: onWebsite ? 'Shown on the website, in this order' : 'Not on the website (no Library number)', items: by('selected') },
      { key: 'backup' as const, title: 'Backup', note: 'Archive only', items: by('backup') },
      { key: 'inuse' as const, title: 'In-use mockups', note: 'AI-generated, never on the website', items: by('inuse') },
      { key: 'other' as const, title: 'Not classified', note: 'No media record yet', items: media.filter((m) => !m.role) },
    ].filter((g) => g.items.length > 0 || g.key === 'selected' || g.key === 'backup')
  }, [media, onWebsite])

  const pickedFiles = media.filter((m) => m.mediaId && picked.has(m.mediaId) && !selectBlock(m))
  const toBackup = pickedFiles.filter((m) => m.role === 'selected')
  const toSelected = pickedFiles.filter((m) => m.role === 'backup')

  const toggle = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const run = useCallback(async (files: MediaFile[], role: 'selected' | 'backup') => {
    if (!onSetRole || files.length === 0) return
    const n = files.length
    const what = role === 'selected' ? 'Make selected' : 'Move to backup'
    const site = onWebsite
      ? role === 'selected'
        ? `\n\nThey will appear on the website, after the current selected files.`
        : `\n\nThey will disappear from the website.`
      : ''
    if (!confirm(`${what}: ${n} file${n > 1 ? 's' : ''}?${site}\n\nEvery change is logged and can be reverted.`)) return
    setBusy(true)
    const ok = await onSetRole(files.map((f) => f.mediaId!), role)
    setBusy(false)
    if (ok) setPicked(new Set())
  }, [onSetRole, onWebsite])

  // Lightbox keys
  useEffect(() => {
    if (!lightbox) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(null)
      else if (e.key === 'ArrowLeft') setLightbox((l) => (l && l.index > 0 ? { ...l, index: l.index - 1 } : l))
      else if (e.key === 'ArrowRight') setLightbox((l) => (l && l.index < l.items.length - 1 ? { ...l, index: l.index + 1 } : l))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightbox])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h3 className={sectionTitle}>Media</h3>
        {onAddMedia && (
          <button
            onClick={onAddMedia}
            className="text-[10px] font-[500] uppercase tracking-[0.08em] px-2.5 py-1 min-h-[24px] rounded-[var(--radius-sm)] border border-[var(--c-gray-200)] text-[var(--c-gray-600)] hover:bg-[var(--c-gray-50)] transition-colors"
          >
            + Add media
          </button>
        )}
      </div>

      {editable && pickedFiles.length > 0 && (
        <div
          role="toolbar"
          aria-label="Batch actions"
          className="sticky top-14 z-30 mb-6 flex flex-wrap items-center gap-3 rounded-[var(--radius-md)] bg-[var(--c-gray-900)] px-4 py-2.5 text-white shadow-[var(--shadow-lg)]"
        >
          <span className="text-[12px] font-[500] tabular-nums">{pickedFiles.length} ticked</span>
          <span className="flex-1" />
          <button
            disabled={busy || toSelected.length === 0}
            onClick={() => run(toSelected, 'selected')}
            className="min-h-[28px] rounded-[var(--radius-sm)] bg-white px-3 text-[11px] font-[500] text-[var(--c-gray-900)] disabled:opacity-40"
          >
            Make selected{toSelected.length ? ` (${toSelected.length})` : ''}
          </button>
          <button
            disabled={busy || toBackup.length === 0}
            onClick={() => run(toBackup, 'backup')}
            className="min-h-[28px] rounded-[var(--radius-sm)] border border-white/30 px-3 text-[11px] font-[500] text-white hover:bg-white/10 disabled:opacity-40"
          >
            Move to backup{toBackup.length ? ` (${toBackup.length})` : ''}
          </button>
          <button
            disabled={busy}
            onClick={() => setPicked(new Set())}
            className="min-h-[28px] px-2 text-[11px] text-white/60 hover:text-white"
          >
            Clear
          </button>
        </div>
      )}

      <div className="space-y-12">
        {groups.map((g) => {
          const tickable = g.items.filter((m) => !selectBlock(m))
          const allTicked = tickable.length > 0 && tickable.every((m) => picked.has(m.mediaId!))
          const someTicked = tickable.some((m) => picked.has(m.mediaId!))
          return (
            <section key={g.key} aria-labelledby={`media-${g.key}`}>
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-4 pb-2 border-b border-[var(--c-gray-200)]">
                <h4 id={`media-${g.key}`} className="text-[13px] font-[500] text-[var(--c-gray-900)]">
                  {g.title} <span className="tabular-nums text-[var(--c-gray-400)] font-[400]">{g.items.length}</span>
                </h4>
                <span className="text-[11px] text-[var(--c-gray-400)]">{g.note}</span>
                <span className="flex-1" />
                {editable && tickable.length > 0 && (
                  <label className="flex items-center gap-2 min-h-[24px] text-[11px] text-[var(--c-gray-600)] cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 cursor-pointer accent-[var(--c-gray-900)]"
                      checked={allTicked}
                      ref={(el) => { if (el) el.indeterminate = someTicked && !allTicked }}
                      onChange={() =>
                        setPicked((prev) => {
                          const next = new Set(prev)
                          for (const m of tickable) {
                            if (allTicked) next.delete(m.mediaId!)
                            else next.add(m.mediaId!)
                          }
                          return next
                        })
                      }
                    />
                    Tick all {g.title.toLowerCase()} ({tickable.length})
                  </label>
                )}
              </div>

              {g.items.length === 0 ? (
                <p className="text-[12px] text-[var(--c-gray-400)]">No files.</p>
              ) : (
                <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {g.items.map((m, i) => (
                    <MediaTile
                      key={m.filename}
                      m={m}
                      editable={editable}
                      ticked={!!m.mediaId && picked.has(m.mediaId)}
                      block={selectBlock(m)}
                      hero={isHero(m)}
                      thumb={isThumb(m)}
                      canBeSpecial={!!onSetSpecial && !!m.mediaId && !isVideo(m.filename) && (!onWebsite || m.role === 'selected')}
                      onToggle={() => m.mediaId && toggle(m.mediaId)}
                      onOpen={() => setLightbox({ items: g.items, index: i })}
                      onSetSpecial={onSetSpecial}
                      onSaveCaption={onSaveCaption}
                      onDelete={onDeleteMedia}
                    />
                  ))}
                </ul>
              )}
            </section>
          )
        })}
      </div>

      {lightbox && (() => {
        const m = lightbox.items[lightbox.index]
        if (!m) return null
        return (
          <div className="fixed inset-0 z-50 bg-[var(--c-black)]/95 flex flex-col items-center justify-center gap-4 p-6" onClick={() => setLightbox(null)}>
            <button className="absolute top-4 right-4 w-10 h-10 text-white/60 hover:text-white text-[24px]" aria-label="Close" onClick={() => setLightbox(null)}>×</button>
            <div className="max-w-[90vw] max-h-[80vh]" onClick={(e) => e.stopPropagation()}>
              {isVideo(m.filename)
                ? <video src={m.path} className="max-w-full max-h-[80vh]" controls autoPlay />
                // eslint-disable-next-line @next/next/no-img-element
                : <img src={m.path} alt={m.caption || ''} className="max-w-full max-h-[80vh] object-contain" />}
            </div>
            <div className="text-center text-[12px] text-white/60 max-w-[720px]" onClick={(e) => e.stopPropagation()}>
              {m.caption && <p className="text-white/85 mb-1">{m.caption}</p>}
              <p className="tabular-nums">{lightbox.index + 1} / {lightbox.items.length} · {m.filename}{m.width && m.height ? ` · ${m.width}×${m.height}` : ''}</p>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

function MediaTile({
  m, editable, ticked, block, hero, thumb, canBeSpecial, onToggle, onOpen, onSetSpecial, onSaveCaption, onDelete,
}: {
  m: MediaFile
  editable: boolean
  ticked: boolean
  block: string | null
  hero: boolean
  thumb: boolean
  canBeSpecial: boolean
  onToggle: () => void
  onOpen: () => void
  onSetSpecial?: (file: MediaFile, kind: 'hero' | 'thumbnail') => Promise<void>
  onSaveCaption?: (file: MediaFile, caption: string) => Promise<void>
  onDelete?: (filename: string) => void
}) {
  const video = isVideo(m.filename)
  const [editingCaption, setEditingCaption] = useState(false)
  const [caption, setCaption] = useState(m.caption || '')

  const saveCaption = async () => {
    setEditingCaption(false)
    if (onSaveCaption && caption.trim() !== (m.caption || '')) await onSaveCaption(m, caption)
  }

  return (
    <li className="flex flex-col gap-1.5">
      <div
        className={`relative aspect-[4/3] overflow-hidden bg-[var(--c-gray-100)] group ${ticked ? 'ring-2 ring-[var(--c-gray-900)] ring-offset-2' : ''}`}
      >
        <button type="button" className="absolute inset-0 w-full h-full cursor-zoom-in" onClick={onOpen} aria-label={`Open ${m.filename}`}>
          {video ? (
            <video src={m.path} className="w-full h-full object-cover" preload="metadata" muted />
          ) : (
            <Image src={m.path} alt="" fill sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" className="object-cover" loading="lazy" />
          )}
        </button>

        {editable && (
          <label
            className="absolute top-1 left-1 z-10 flex items-center justify-center w-7 h-7 rounded-[3px] bg-white/90 shadow-sm cursor-pointer has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60"
            title={block || (ticked ? 'Untick' : 'Tick')}
          >
            <input
              type="checkbox"
              className="w-4 h-4 cursor-pointer accent-[var(--c-gray-900)] disabled:cursor-not-allowed"
              checked={ticked}
              disabled={!!block}
              onChange={onToggle}
              aria-label={`Tick ${m.filename}${block ? ` (${block})` : ''}`}
            />
          </label>
        )}

        <div className="absolute top-1 right-1 flex flex-col items-end gap-1 pointer-events-none">
          {hero && <span className="text-[9px] font-[500] uppercase tracking-[0.05em] text-white bg-[var(--c-gray-900)] px-1.5 py-0.5 rounded-[2px]">Hero</span>}
          {thumb && <span className="text-[9px] font-[500] uppercase tracking-[0.05em] text-[var(--c-gray-900)] bg-white px-1.5 py-0.5 rounded-[2px]">Thumb</span>}
          {video && <span className="text-[9px] font-[500] uppercase tracking-[0.05em] text-white bg-black/70 px-1.5 py-0.5 rounded-[2px]">Video{m.duration ? ` ${Math.round(m.duration)}s` : ''}</span>}
        </div>

        {(canBeSpecial || onDelete) && (
          <div className="absolute inset-x-0 bottom-0 flex flex-wrap justify-end gap-1 p-1.5 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
            {canBeSpecial && !hero && (
              <button onClick={() => onSetSpecial!(m, 'hero')} className="min-h-[24px] text-[9px] font-[500] uppercase tracking-[0.05em] px-2 rounded-[2px] bg-white/95 text-[var(--c-gray-900)] hover:bg-white" title="Use as the hero on the website">Set hero</button>
            )}
            {canBeSpecial && !thumb && (
              <button onClick={() => onSetSpecial!(m, 'thumbnail')} className="min-h-[24px] text-[9px] font-[500] uppercase tracking-[0.05em] px-2 rounded-[2px] bg-white/95 text-[var(--c-gray-900)] hover:bg-white" title="Use as the thumbnail on the website">Set thumb</button>
            )}
            {onDelete && !hero && !thumb && (
              <button onClick={() => { if (confirm(`Delete ${m.filename}? The file is removed from storage.`)) onDelete(m.filename) }} className="min-h-[24px] min-w-[24px] text-[12px] font-[600] leading-none px-1.5 rounded-[2px] bg-red-600 text-white hover:bg-red-700" aria-label={`Delete ${m.filename}`}>×</button>
            )}
          </div>
        )}
      </div>

      <div className="text-[11px] leading-[1.4] text-[var(--c-gray-500)] min-w-0">
        {m.role === 'backup' && m.promoteBlock && (
          <p className="text-[var(--c-gray-600)]"><span aria-hidden>⚠︎ </span>{m.promoteBlock}</p>
        )}
        {m.role === 'selected' && (
          editingCaption ? (
            <textarea
              autoFocus
              rows={2}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              onBlur={saveCaption}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); (e.target as HTMLTextAreaElement).blur() }
                if (e.key === 'Escape') { setCaption(m.caption || ''); setEditingCaption(false) }
              }}
              aria-label={`Caption for ${m.filename}`}
              className="w-full text-[11px] border border-[var(--c-gray-300)] rounded-[var(--radius-sm)] px-1.5 py-1 outline-none focus:border-[var(--c-gray-900)] text-[var(--c-gray-800)]"
            />
          ) : onSaveCaption ? (
            <button type="button" onClick={() => { setCaption(m.caption || ''); setEditingCaption(true) }} className={`block w-full text-left min-h-[24px] hover:text-[var(--c-gray-900)] ${m.caption ? 'text-[var(--c-gray-700)]' : 'text-[var(--c-gray-400)] italic'}`}>
              {m.caption || 'Add caption'}
            </button>
          ) : (
            m.caption && <p className="text-[var(--c-gray-700)]">{m.caption}</p>
          )
        )}
        <p className="truncate tabular-nums" title={m.filename}>
          {m.source === 'deck' ? 'Deck' : m.source === 'archive' ? 'Archive' : ''}
          {m.deckSlide ? ` · slide ${m.deckSlide}` : ''}
          {m.width && m.height ? ` · ${m.width}×${m.height}` : ''}
        </p>
      </div>
    </li>
  )
}
