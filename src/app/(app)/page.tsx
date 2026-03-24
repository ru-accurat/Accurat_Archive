'use client'

import { useRouter } from 'next/navigation'
import { useProjects } from '@/hooks/use-projects'
import { useProjectStore } from '@/stores/project-store'
import { useUiStore } from '@/stores/ui-store'
import { useFilteredProjects } from '@/hooks/use-filters'
import { ProjectTable } from '@/components/index/ProjectTable'
import { ProjectGrid } from '@/components/index/ProjectGrid'
import { FilterAccordion } from '@/components/index/FilterAccordion'
import { FilterBar } from '@/components/index/FilterBar'
import { BulkActions } from '@/components/index/BulkActions'
export default function IndexPage() {
  const router = useRouter()
  const { loading } = useProjects()
  const { viewMode, setViewMode, editMode, setEditMode } = useUiStore()
  const { setSearch, filters, projects } = useProjectStore()
  const filtered = useFilteredProjects()
  // Status default is ['internal', 'public'] — only count as active filter if different from default
  const isStatusNonDefault = filters.status.length !== 2 || !filters.status.includes('internal') || !filters.status.includes('public')
  const hasActiveFilters = !!(filters.search || filters.domains.length || filters.services.length || filters.output.length || filters.section.length || filters.tier.length || filters.missing.length || isStatusNonDefault)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-[var(--c-white)] text-[var(--c-gray-400)] text-[13px] font-[350]">
        Loading projects...
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-[var(--c-white)]">
      <div className="flex items-end gap-4 px-4 sm:px-6 md:px-[48px] pt-5 pb-3">
        <div className="flex-1 relative">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="absolute left-0 top-1/2 -translate-y-1/2 text-[var(--c-gray-300)]">
            <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3" />
            <path d="M9.5 9.5L13 13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            placeholder="Search projects..."
            value={filters.search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-6 pr-0 py-2 text-[14px] font-[350] bg-transparent border-b border-[var(--c-gray-200)] focus:border-[var(--c-gray-900)] focus:outline-none transition-colors duration-200 placeholder:text-[var(--c-gray-400)]"
          />
        </div>
        <div className="flex items-center gap-1 pb-1.5">
          {viewMode === 'table' && (
            <button
              onClick={() => setEditMode(!editMode)}
              className={`text-[11px] font-[450] px-3 py-1.5 rounded-[var(--radius-sm)] transition-colors mr-1 ${
                editMode
                  ? 'bg-[var(--c-gray-900)] text-white'
                  : 'border border-[var(--c-gray-200)] text-[var(--c-gray-600)] hover:bg-[var(--c-gray-50)]'
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
          <button
            onClick={() => router.push('/new')}
            className="text-[11px] font-[450] px-3 py-1.5 rounded-[var(--radius-sm)] bg-[var(--c-gray-900)] text-white hover:bg-[var(--c-gray-800)] transition-colors ml-1"
          >
            + New Project
          </button>
        </div>
      </div>

      <FilterAccordion />
      <FilterBar />
      {hasActiveFilters && (
        <div className="px-4 sm:px-6 md:px-[48px] pb-2">
          <span className="text-[11px] font-[400] text-[var(--c-gray-400)]">
            {filtered.length} of {projects.length} projects
          </span>
        </div>
      )}
      <BulkActions />

      <div className="flex-1 overflow-hidden">
        {viewMode === 'table' ? <ProjectTable /> : <ProjectGrid />}
      </div>
    </div>
  )
}
