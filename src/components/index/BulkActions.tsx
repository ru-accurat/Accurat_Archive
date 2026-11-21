'use client'

import { useState, useRef, useEffect } from 'react'
import { api } from '@/lib/api-client'
import { toast } from '@/lib/toast'
import { useProjectStore } from '@/stores/project-store'
import { BulkGenerateModal } from '@/components/shared/BulkGenerateModal'
import { CollectionPicker } from '@/components/shared/CollectionPicker'
import { useAuth } from '@/hooks/use-auth'
import { canEdit } from '@/lib/auth'
import { ON_WEBSITE, PROJECT_STATUSES, STATUS_HINTS, STATUS_LABELS, type ProjectStatus } from '@/lib/status'
import type { StatusChangeResponse } from '@/lib/types'

type DownloadKind = 'all' | 'media' | 'videos'

const DOWNLOAD_OPTIONS: { kind: DownloadKind; label: string; hint: string; filename: (date: string) => string }[] = [
  { kind: 'all',    label: 'Content + media',    hint: 'project.json + images + videos + gifs',    filename: (d) => `accurat-archive-export-${d}.zip` },
  { kind: 'media',  label: 'Media only',         hint: 'images + videos + gifs, no metadata',      filename: (d) => `accurat-archive-media-${d}.zip` },
  { kind: 'videos', label: 'Videos only',        hint: 'videos + gifs, no images',                 filename: (d) => `accurat-archive-videos-${d}.zip` },
]

const LARGE_SELECTION_THRESHOLD = 20

export function BulkActions() {
  const { selectedIds, clearSelection, projects, updateProject } = useProjectStore()
  const { profile } = useAuth()
  const userCanEdit = canEdit(profile?.role)
  const [statusMenuOpen, setStatusMenuOpen] = useState(false)
  const [settingStatus, setSettingStatus] = useState(false)
  const [statusResult, setStatusResult] = useState<(StatusChangeResponse & { status: ProjectStatus }) | null>(null)
  const statusMenuRef = useRef<HTMLDivElement>(null)
  const [showGenerate, setShowGenerate] = useState(false)
  const [showCollections, setShowCollections] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false)
  const downloadMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(e.target as Node)) {
        setDownloadMenuOpen(false)
      }
    }
    if (downloadMenuOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [downloadMenuOpen])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (statusMenuRef.current && !statusMenuRef.current.contains(e.target as Node)) setStatusMenuOpen(false)
    }
    if (statusMenuOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [statusMenuOpen])

  const showSkipped = !!statusResult && statusResult.skipped.length > 0
  if (selectedIds.length === 0 && !showSkipped) return null

  const selectedSet = new Set(selectedIds)
  const selectedProjects = projects.filter((p) => selectedSet.has(p.id))
  const countIn = (st: ProjectStatus) => selectedProjects.filter((p) => p.status === st).length

  const handleSetStatus = async (next: ProjectStatus) => {
    setStatusMenuOpen(false)
    const moving = selectedProjects.filter((p) => p.status !== next)
    if (moving.length === 0) { toast.info(`All selected projects are already ${STATUS_LABELS[next]}`); return }
    const goingOn = moving.filter((p) => !ON_WEBSITE.has(p.status)).length
    const leaving = moving.filter((p) => ON_WEBSITE.has(p.status)).length
    const lines = [`Set ${moving.length} project${moving.length === 1 ? '' : 's'} to ${STATUS_LABELS[next]}?`]
    if (ON_WEBSITE.has(next) && goingOn > 0) {
      lines.push(`${goingOn} go${goingOn === 1 ? 'es' : ''} on the website${next === 'private' ? ' as confidential' : ''}. Projects without a Library number get the next free ones. Any project missing selected media with a hero and thumbnail, a category, an offering or "What we made" is skipped and listed.`)
    }
    if (!ON_WEBSITE.has(next) && leaving > 0) {
      lines.push(`${leaving} leave${leaving === 1 ? 's' : ''} the website. Their Library numbers stay reserved.`)
    }
    lines.push('Every change is logged.')
    if (!confirm(lines.join('\n\n'))) return
    setSettingStatus(true)
    try {
      const result = await api.setProjectsStatus(moving.map((p) => p.id), next)
      for (const c of result.changed) updateProject(c.id, { status: c.status })
      setStatusResult(result.skipped.length > 0 ? { ...result, status: next } : null)
      if (result.skipped.length === 0) {
        toast.success(`${result.changed.length} project${result.changed.length === 1 ? '' : 's'} set to ${STATUS_LABELS[next]}`)
      }
    } catch (err) {
      toast.error('Status not changed. ' + (err instanceof Error ? err.message : String(err)))
    }
    setSettingStatus(false)
  }

  const handleExportCsv = async () => {
    setExporting(true)
    try {
      const blob = await api.exportCsv(selectedIds)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `accurat-archive-metadata-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`Exported ${selectedIds.length} project${selectedIds.length !== 1 ? 's' : ''} as CSV`)
    } catch (err) {
      toast.error('CSV export failed: ' + String(err))
    }
    setExporting(false)
  }

  const handleDownload = async (kind: DownloadKind) => {
    setDownloadMenuOpen(false)
    const opt = DOWNLOAD_OPTIONS.find((o) => o.kind === kind)!
    const big = selectedIds.length >= LARGE_SELECTION_THRESHOLD
    if (big) {
      toast.info(`Preparing ${selectedIds.length} projects${kind === 'videos' ? ' (videos only)' : ''} — this may take several minutes and be several GB. Keep this tab open.`)
    }
    setExporting(true)
    try {
      const fetcher = kind === 'all' ? api.exportZip : kind === 'media' ? api.exportMediaZip : api.exportVideosZip
      const blob = await fetcher(selectedIds)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = opt.filename(new Date().toISOString().slice(0, 10))
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`Downloaded ${selectedIds.length} project${selectedIds.length !== 1 ? 's' : ''} — ${opt.label.toLowerCase()}`)
    } catch (err) {
      toast.error('Download failed: ' + String(err))
    }
    setExporting(false)
  }

  return (
    <>
      {selectedIds.length > 0 && (
      <div className="flex items-center flex-wrap gap-3 sm:gap-4 bg-[var(--c-gray-900)] text-white px-4 sm:px-6 md:px-[48px] py-2.5">
        <span className="text-[12px] font-[450]">
          {selectedIds.length} selected
        </span>

        <div className="flex-1" />

        {userCanEdit && (
          <div className="relative" ref={statusMenuRef}>
            <button
              onClick={() => setStatusMenuOpen((v) => !v)}
              disabled={settingStatus}
              aria-expanded={statusMenuOpen}
              aria-haspopup="menu"
              className="text-[11px] font-[450] px-3 py-1.5 rounded-[var(--radius-sm)] bg-white/10 text-white/70 hover:bg-white/15 transition-colors duration-200 disabled:opacity-40 flex items-center gap-1.5"
            >
              {settingStatus ? 'Setting status…' : 'Set status'}
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden>
                <path d="M1.5 3L4 5.5L6.5 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {statusMenuOpen && (
              <div role="menu" className="absolute right-0 top-9 w-72 bg-[var(--c-gray-900)] border border-white/10 rounded-[var(--radius-md)] shadow-lg py-1 z-50">
                {PROJECT_STATUSES.map((st) => {
                  const already = countIn(st)
                  return (
                    <button
                      key={st}
                      role="menuitem"
                      onClick={() => handleSetStatus(st)}
                      className="w-full text-left px-3 py-2 hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-baseline justify-between gap-3 text-[12px] font-[450] text-white/80">
                        <span>{STATUS_LABELS[st]}</span>
                        {already > 0 && <span className="text-[10px] font-[400] text-white/40 tabular-nums">{already} already</span>}
                      </div>
                      <div className="text-[10px] font-[400] text-white/40 mt-0.5">{STATUS_HINTS[st]}</div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        <button
          onClick={() => setShowCollections(true)}
          className="text-[11px] font-[450] px-3 py-1.5 rounded-[var(--radius-sm)] bg-white/10 text-white/70 hover:bg-white/15 transition-colors duration-200"
        >
          Add to Collection
        </button>

        <button
          onClick={() => setShowGenerate(true)}
          className="text-[11px] font-[450] px-3 py-1.5 rounded-[var(--radius-sm)] bg-[var(--c-ai)]/20 text-[var(--c-ai)] hover:bg-[var(--c-ai)]/30 transition-colors duration-200"
        >
          Generate Missing
        </button>

        <button
          onClick={handleExportCsv}
          disabled={exporting}
          className="text-[11px] font-[400] px-3 py-1.5 rounded-[var(--radius-sm)] bg-white/10 text-white/70 hover:bg-white/15 transition-colors duration-200 disabled:opacity-40"
        >
          Export CSV
        </button>

        <div className="relative" ref={downloadMenuRef}>
          <button
            onClick={() => setDownloadMenuOpen((v) => !v)}
            disabled={exporting}
            className="text-[11px] font-[400] px-3 py-1.5 rounded-[var(--radius-sm)] bg-white/10 text-white/70 hover:bg-white/15 transition-colors duration-200 disabled:opacity-40 flex items-center gap-1.5"
          >
            Download
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden>
              <path d="M1.5 3L4 5.5L6.5 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {downloadMenuOpen && (
            <div className="absolute right-0 top-9 w-64 bg-[var(--c-gray-900)] border border-white/10 rounded-[var(--radius-md)] shadow-lg py-1 z-50">
              {DOWNLOAD_OPTIONS.map((opt) => (
                <button
                  key={opt.kind}
                  onClick={() => handleDownload(opt.kind)}
                  className="w-full text-left px-3 py-2 hover:bg-white/5 transition-colors"
                >
                  <div className="text-[12px] font-[450] text-white/80">{opt.label}</div>
                  <div className="text-[10px] font-[400] text-white/40 mt-0.5">{opt.hint}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={clearSelection}
          className="text-[11px] font-[400] text-white/40 hover:text-white/70 transition-colors duration-200"
        >
          Clear
        </button>
      </div>
      )}

      {statusResult && showSkipped && (
        <div role="status" className="bg-[var(--c-gray-50)] border-b border-[var(--c-gray-200)] px-4 sm:px-6 md:px-[48px] py-3 text-[12px] text-[var(--c-gray-800)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-[500]">
                {statusResult.changed.length} set to {STATUS_LABELS[statusResult.status]}
                {statusResult.skipped.length > 0 && `, ${statusResult.skipped.length} skipped`}
              </p>
              {statusResult.skipped.length > 0 && (
                <ul className="mt-1.5 space-y-1 text-[11px] text-[var(--c-gray-600)]">
                  {statusResult.skipped.map((s) => (
                    <li key={s.id}><span className="text-[var(--c-gray-900)]">{s.name}</span>: {s.reason}</li>
                  ))}
                </ul>
              )}
            </div>
            <button
              onClick={() => setStatusResult(null)}
              className="shrink-0 min-h-[24px] text-[11px] text-[var(--c-gray-500)] hover:text-[var(--c-gray-900)]"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <BulkGenerateModal
        open={showGenerate}
        onClose={() => setShowGenerate(false)}
        projectIds={selectedIds}
      />
      <CollectionPicker
        open={showCollections}
        onClose={() => setShowCollections(false)}
        projectIds={selectedIds}
      />
    </>
  )
}
