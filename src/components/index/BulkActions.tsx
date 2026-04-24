'use client'

import { useState, useRef, useEffect } from 'react'
import { api } from '@/lib/api-client'
import { toast } from '@/lib/toast'
import { useProjectStore } from '@/stores/project-store'
import { BulkGenerateModal } from '@/components/shared/BulkGenerateModal'
import { CollectionPicker } from '@/components/shared/CollectionPicker'

type DownloadKind = 'all' | 'media' | 'videos'

const DOWNLOAD_OPTIONS: { kind: DownloadKind; label: string; hint: string; filename: (date: string) => string }[] = [
  { kind: 'all',    label: 'Content + media',    hint: 'project.json + images + videos + gifs',    filename: (d) => `accurat-archive-export-${d}.zip` },
  { kind: 'media',  label: 'Media only',         hint: 'images + videos + gifs, no metadata',      filename: (d) => `accurat-archive-media-${d}.zip` },
  { kind: 'videos', label: 'Videos only',        hint: 'videos + gifs, no images',                 filename: (d) => `accurat-archive-videos-${d}.zip` },
]

const LARGE_SELECTION_THRESHOLD = 20

export function BulkActions() {
  const { selectedIds, clearSelection } = useProjectStore()
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

  if (selectedIds.length === 0) return null

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
      <div className="flex items-center flex-wrap gap-3 sm:gap-4 bg-[var(--c-gray-900)] text-white px-4 sm:px-6 md:px-[48px] py-2.5">
        <span className="text-[12px] font-[450]">
          {selectedIds.length} selected
        </span>

        <div className="flex-1" />

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
