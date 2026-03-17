'use client'

import { useMemo, useState } from 'react'
import { useProjects } from '@/hooks/use-projects'
import { useProjectStore } from '@/stores/project-store'
import { useUiStore } from '@/stores/ui-store'
import { ProjectTable } from '@/components/index/ProjectTable'
import { ProjectGrid } from '@/components/index/ProjectGrid'
import { FilterAccordion } from '@/components/index/FilterAccordion'
import { FilterBar } from '@/components/index/FilterBar'
import { BulkActions } from '@/components/index/BulkActions'
import { findDuplicates } from '@/lib/similarity'

export default function IndexPage() {
  const { loading } = useProjects()
  const { viewMode, setViewMode, editMode, setEditMode } = useUiStore()
  const { setSearch, filters, projects } = useProjectStore()
  const [dismissedDuplicates, setDismissedDuplicates] = useState(false)

  const duplicates = useMemo(() => findDuplicates(projects), [projects])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-[var(--c-white)] text-[var(--c-gray-400)] text-[13px] font-[350]">
        Loading projects...
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-[var(--c-white)]">
      {duplicates.length > 0 && !dismissedDuplicates && (
        <div
          className="flex items-center gap-3 bg-[var(--c-warning)]/10 border-b border-[var(--c-warning)]/20"
          style={{ padding: '8px 48px' }}
        >
          <span className="text-[11px] font-[450] text-[var(--c-warning)]">
            {duplicates.length} potential duplicate{duplicates.length !== 1 ? 's' : ''} detected
          </span>
          <span className="text-[11px] font-[400] text-[var(--c-gray-500)]">
            {duplicates.slice(0, 3).map((d) => `"${d.a.client}" ≈ "${d.b.client}"`).join(', ')}
            {duplicates.length > 3 ? '...' : ''}
          </span>
          <div className="flex-1" />
          <button
            onClick={() => setDismissedDuplicates(true)}
            className="text-[10px] font-[400] text-[var(--c-gray-400)] hover:text-[var(--c-gray-700)] transition-colors duration-200"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="flex items-end gap-4" style={{ paddingLeft: 48, paddingRight: 48, paddingTop: 20, paddingBottom: 12 }}>
        <input
          type="text"
          placeholder="Search projects..."
          value={filters.search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-0 py-2 text-[14px] font-[350] bg-transparent border-b border-[var(--c-gray-200)] focus:border-[var(--c-gray-900)] focus:outline-none transition-colors duration-200 placeholder:text-[var(--c-gray-400)]"
        />
        <div className="flex items-center gap-1 pb-1.5">
          {viewMode === 'table' && (
            <button
              onClick={() => setEditMode(!editMode)}
              className={`px-2.5 py-1 rounded-[var(--radius-sm)] text-[10px] font-[450] uppercase tracking-[0.06em] transition-all duration-150 mr-1 ${
                editMode
                  ? 'bg-[var(--c-gray-900)] text-white'
                  : 'text-[var(--c-gray-400)] hover:text-[var(--c-gray-700)] hover:bg-[var(--c-gray-50)]'
              }`}
            >
              {editMode ? 'Done' : 'Edit'}
            </button>
          )}
          <button
            onClick={() => setViewMode('table')}
            className={`p-1.5 rounded-[var(--radius-sm)] transition-colors duration-150 ${
              viewMode === 'table' ? 'text-[var(--c-gray-900)]' : 'text-[var(--c-gray-300)] hover:text-[var(--c-gray-500)]'
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 3h12M2 6.5h12M2 10h12M2 13.5h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          </button>
          <button
            onClick={() => { setViewMode('grid'); setEditMode(false) }}
            className={`p-1.5 rounded-[var(--radius-sm)] transition-colors duration-150 ${
              viewMode === 'grid' ? 'text-[var(--c-gray-900)]' : 'text-[var(--c-gray-300)] hover:text-[var(--c-gray-500)]'
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
              <rect x="9" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
              <rect x="2" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
              <rect x="9" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
            </svg>
          </button>
        </div>
      </div>

      <FilterAccordion />
      <FilterBar />
      <BulkActions />

      <div className="flex-1 overflow-hidden">
        {viewMode === 'table' ? <ProjectTable /> : <ProjectGrid />}
      </div>
    </div>
  )
}
