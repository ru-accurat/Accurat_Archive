'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from '@/lib/toast'
import { mediaUrl } from '@/lib/media-url'
import type { Project } from '@/lib/types'

interface Props {
  open: boolean
  onClose: () => void
  collectionId: string
  collectionName: string
  collectionSubtitle?: string
  projects: Project[]
}

type Layout = 'standard' | 'detailed'

/** Default selection: hero + first 2 gallery images */
function defaultsFor(p: Project): string[] {
  const all = p.mediaOrder || []
  const picks: string[] = []
  if (p.heroImage) picks.push(p.heroImage)
  for (const f of all) {
    if (f === p.heroImage) continue
    picks.push(f)
    if (picks.length >= 3) break
  }
  return picks
}

export function PitchDeckExporter({
  open,
  onClose,
  collectionId,
  collectionName,
  collectionSubtitle,
  projects,
}: Props) {
  const [coverTitle, setCoverTitle] = useState('')
  const [coverSubtitle, setCoverSubtitle] = useState('')
  const [layout, setLayout] = useState<Layout>('standard')
  const [selection, setSelection] = useState<Record<string, string[]>>({})
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    if (!open) return
    setCoverTitle(collectionName || '')
    setCoverSubtitle(collectionSubtitle || '')
    setLayout('standard')
    const initial: Record<string, string[]> = {}
    for (const p of projects) initial[p.id] = defaultsFor(p)
    setSelection(initial)
    setGenerating(false)
  }, [open, collectionName, collectionSubtitle, projects])

  const totalSelected = useMemo(
    () => Object.values(selection).reduce((acc, files) => acc + files.length, 0),
    [selection]
  )

  if (!open) return null

  function toggleFile(projectId: string, filename: string) {
    setSelection(prev => {
      const curr = new Set(prev[projectId] || [])
      if (curr.has(filename)) curr.delete(filename)
      else curr.add(filename)
      return { ...prev, [projectId]: Array.from(curr) }
    })
  }

  function selectAll(p: Project) {
    setSelection(prev => ({ ...prev, [p.id]: [...(p.mediaOrder || [])] }))
  }

  function heroOnly(p: Project) {
    setSelection(prev => ({ ...prev, [p.id]: p.heroImage ? [p.heroImage] : [] }))
  }

  function resetProject(p: Project) {
    setSelection(prev => ({ ...prev, [p.id]: defaultsFor(p) }))
  }

  function clearProject(p: Project) {
    setSelection(prev => ({ ...prev, [p.id]: [] }))
  }

  async function handleGenerate() {
    setGenerating(true)
    const loadingId = toast.loading('Generating pitch deck…')
    try {
      const res = await fetch(`/api/collections/${collectionId}/export-pptx`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coverTitle,
          coverSubtitle,
          layout,
          projectMedia: selection,
        }),
      })
      if (!res.ok) {
        throw new Error(`Export failed (${res.status})`)
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const safe = (collectionName || 'pitch-deck').replace(/[^a-z0-9-_]+/gi, '-').toLowerCase()
      a.download = `${safe}.pptx`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast.dismiss(loadingId)
      toast.success('Pitch deck downloaded')
      onClose()
    } catch (err) {
      toast.dismiss(loadingId)
      toast.error(err instanceof Error ? err.message : 'Failed to generate pitch deck')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-[var(--c-white)] rounded-[var(--radius-md)] shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-[var(--c-gray-200)] flex items-center justify-between">
          <div>
            <h2 className="text-[16px] font-[600] text-[var(--c-gray-900)]">Export pitch deck</h2>
            <p className="text-[12px] text-[var(--c-gray-500)] mt-0.5">
              {projects.length} projects · {totalSelected} images selected
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--c-gray-500)] hover:text-[var(--c-gray-900)] text-[18px] leading-none px-2"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="px-6 py-4 border-b border-[var(--c-gray-200)] grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-[500] text-[var(--c-gray-600)] mb-1">Cover title</label>
            <input
              type="text"
              value={coverTitle}
              onChange={e => setCoverTitle(e.target.value)}
              className="w-full px-3 py-2 text-[13px] border border-[var(--c-gray-200)] rounded-[var(--radius-sm)] focus:outline-none focus:border-[var(--c-gray-400)]"
            />
          </div>
          <div>
            <label className="block text-[11px] font-[500] text-[var(--c-gray-600)] mb-1">Cover subtitle</label>
            <input
              type="text"
              value={coverSubtitle}
              onChange={e => setCoverSubtitle(e.target.value)}
              className="w-full px-3 py-2 text-[13px] border border-[var(--c-gray-200)] rounded-[var(--radius-sm)] focus:outline-none focus:border-[var(--c-gray-400)]"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-[11px] font-[500] text-[var(--c-gray-600)] mb-1">Layout</label>
            <div className="inline-flex rounded-[var(--radius-sm)] border border-[var(--c-gray-200)] overflow-hidden">
              <button
                onClick={() => setLayout('standard')}
                className={`px-3 py-1.5 text-[12px] ${layout === 'standard' ? 'bg-[var(--c-gray-900)] text-white' : 'bg-transparent text-[var(--c-gray-600)]'}`}
              >
                Standard (1 slide / project)
              </button>
              <button
                onClick={() => setLayout('detailed')}
                className={`px-3 py-1.5 text-[12px] ${layout === 'detailed' ? 'bg-[var(--c-gray-900)] text-white' : 'bg-transparent text-[var(--c-gray-600)]'}`}
              >
                Detailed (intro + N image slides)
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {projects.length === 0 && (
            <p className="text-[13px] text-[var(--c-gray-500)]">This collection has no projects.</p>
          )}
          {projects.map(p => {
            const media = p.mediaOrder || []
            const sel = new Set(selection[p.id] || [])
            return (
              <div key={p.id} className="border border-[var(--c-gray-200)] rounded-[var(--radius-sm)] p-4">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="min-w-0">
                    <div className="text-[13px] font-[600] text-[var(--c-gray-900)] truncate">
                      {p.projectName || p.fullName}
                    </div>
                    <div className="text-[11px] text-[var(--c-gray-500)] truncate">
                      {p.client} · {sel.size} / {media.length} selected
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => heroOnly(p)}
                      className="text-[10px] px-2 py-1 rounded-[var(--radius-sm)] border border-[var(--c-gray-200)] text-[var(--c-gray-600)] hover:bg-[var(--c-gray-50)]"
                    >
                      Hero only
                    </button>
                    <button
                      onClick={() => selectAll(p)}
                      className="text-[10px] px-2 py-1 rounded-[var(--radius-sm)] border border-[var(--c-gray-200)] text-[var(--c-gray-600)] hover:bg-[var(--c-gray-50)]"
                    >
                      Select all
                    </button>
                    <button
                      onClick={() => resetProject(p)}
                      className="text-[10px] px-2 py-1 rounded-[var(--radius-sm)] border border-[var(--c-gray-200)] text-[var(--c-gray-600)] hover:bg-[var(--c-gray-50)]"
                    >
                      Reset
                    </button>
                    <button
                      onClick={() => clearProject(p)}
                      className="text-[10px] px-2 py-1 rounded-[var(--radius-sm)] border border-[var(--c-gray-200)] text-[var(--c-gray-600)] hover:bg-[var(--c-gray-50)]"
                    >
                      Clear
                    </button>
                  </div>
                </div>
                {media.length === 0 ? (
                  <p className="text-[11px] text-[var(--c-gray-400)] italic">No media — will render as text-only slide.</p>
                ) : (
                  <div className="grid grid-cols-6 md:grid-cols-8 gap-2">
                    {media.map(filename => {
                      const isSelected = sel.has(filename)
                      const isHero = filename === p.heroImage
                      return (
                        <button
                          key={filename}
                          type="button"
                          onClick={() => toggleFile(p.id, filename)}
                          className={`relative aspect-[4/3] rounded-[var(--radius-sm)] overflow-hidden border-2 ${isSelected ? 'border-[var(--c-gray-900)]' : 'border-transparent'} bg-[var(--c-gray-100)]`}
                          title={filename}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={mediaUrl(p.folderName, filename)}
                            alt={filename}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                          {isHero && (
                            <span className="absolute top-1 left-1 text-[8px] font-[600] bg-[var(--c-gray-900)] text-white px-1 rounded-sm">HERO</span>
                          )}
                          {isSelected && (
                            <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[var(--c-gray-900)] text-white text-[9px] flex items-center justify-center">✓</span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="px-6 py-4 border-t border-[var(--c-gray-200)] flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            disabled={generating}
            className="text-[12px] px-4 py-2 rounded-[var(--radius-sm)] border border-[var(--c-gray-200)] text-[var(--c-gray-600)] hover:bg-[var(--c-gray-50)] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={generating || projects.length === 0}
            className="text-[12px] px-4 py-2 rounded-[var(--radius-sm)] bg-[var(--c-gray-900)] text-white hover:bg-[var(--c-gray-800)] disabled:opacity-50"
          >
            {generating ? 'Generating…' : 'Generate .pptx'}
          </button>
        </div>
      </div>
    </div>
  )
}
