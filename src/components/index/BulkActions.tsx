'use client'

import { useState } from 'react'
import { api } from '@/lib/api-client'
import { useProjectStore } from '@/stores/project-store'
import { BulkGenerateModal } from '@/components/shared/BulkGenerateModal'
import { CollectionPicker } from '@/components/shared/CollectionPicker'

export function BulkActions() {
  const { selectedIds, clearSelection, projects } = useProjectStore()
  const [showGenerate, setShowGenerate] = useState(false)
  const [showCollections, setShowCollections] = useState(false)
  const [exporting, setExporting] = useState(false)

  if (selectedIds.length === 0) return null

  const handleExportCsv = async () => {
    setExporting(true)
    try {
      const blob = await api.exportCsv(selectedIds)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'export.csv'
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      alert(String(err))
    }
    setExporting(false)
  }

  const handleExportZip = async () => {
    setExporting(true)
    try {
      const blob = await api.exportZip(selectedIds)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'export.zip'
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      alert(String(err))
    }
    setExporting(false)
  }

  return (
    <>
      <div
        className="flex items-center flex-wrap gap-3 sm:gap-4 bg-[var(--c-gray-900)] text-white px-4 sm:px-6 md:px-[48px] py-2.5"
      >
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

        <button
          onClick={handleExportZip}
          disabled={exporting}
          className="text-[11px] font-[400] px-3 py-1.5 rounded-[var(--radius-sm)] bg-white/10 text-white/70 hover:bg-white/15 transition-colors duration-200 disabled:opacity-40"
        >
          Export ZIP
        </button>

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
