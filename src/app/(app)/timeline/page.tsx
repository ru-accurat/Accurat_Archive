'use client'

import { useProjects } from '@/hooks/use-projects'
import { useProjectStore } from '@/stores/project-store'
import { useSharedFilters } from '@/hooks/use-shared-filters'
import { CompactFilterBar } from '@/components/shared/CompactFilterBar'
import { EmptyState } from '@/components/shared/EmptyState'
import { MobileOnlyNotice } from '@/components/shared/MobileOnlyNotice'
import { useRouter } from 'next/navigation'
import { useMemo, useRef, useState } from 'react'

const UNIT_COLORS: Record<string, string> = {
  'Studio': '#3b82f6',
  'Tech': '#22c55e',
  'Studio, Tech': '#a78bfa',
}

const ROW_H = 28
const YEAR_W = 120
const LEFT_W = 200

export default function TimelinePage() {
  const { loading } = useProjects()
  const allProjects = useProjectStore((s) => s.projects)
  const router = useRouter()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  // Only projects with dates are relevant for the timeline
  const projectsWithDates = useMemo(() => allProjects.filter((p) => p.start), [allProjects])
  const { filters, filtered, options, toggleFilter, setSearch, clearFilters, hasActiveFilters } = useSharedFilters(projectsWithDates)

  const { sorted, minYear, maxYear } = useMemo(() => {
    const years = filtered.map((p) => p.start!).concat(filtered.filter((p) => p.end).map((p) => p.end!))
    const min = years.length ? Math.min(...years) : 2010
    const max = years.length ? Math.max(...years) : 2026
    const sorted = [...filtered].sort((a, b) => (a.start || 0) - (b.start || 0) || a.client.localeCompare(b.client))
    return { sorted, minYear: min, maxYear: max + 1 }
  }, [filtered])

  const yearCount = maxYear - minYear + 1
  const years = Array.from({ length: yearCount }, (_, i) => minYear + i)

  if (loading) {
    return (
      <div className="h-full bg-[var(--c-white)] p-6">
        <div className="h-[28px] w-40 bg-[var(--c-gray-100)] rounded animate-pulse" />
      </div>
    )
  }

  return (
    <MobileOnlyNotice feature="Timeline">
    <div className="flex flex-col h-full bg-[var(--c-white)]">
      <div className="px-4 sm:px-6 md:px-[48px] pt-5 pb-3 flex items-start justify-between">
        <div>
          <h1 className="text-[1.4rem] font-[300] tracking-[-0.02em] text-[var(--c-gray-900)]">
            Timeline
          </h1>
          <p className="text-[12px] text-[var(--c-gray-400)] mt-1">
            {hasActiveFilters ? `${sorted.length} of ${projectsWithDates.length}` : sorted.length} projects with dates
          </p>
        </div>
        <button
          onClick={() => router.push('/new')}
          className="text-[11px] font-[450] px-3 py-1.5 rounded-[var(--radius-sm)] bg-[var(--c-gray-900)] text-white hover:bg-[var(--c-gray-800)] transition-colors shrink-0 mt-1"
        >
          + New Project
        </button>
      </div>

      <CompactFilterBar
        filters={filters}
        options={options}
        onToggle={toggleFilter}
        onSearchChange={setSearch}
        onClear={clearFilters}
        hasActiveFilters={hasActiveFilters}
        totalCount={projectsWithDates.length}
        filteredCount={sorted.length}
      />

      {sorted.length === 0 ? (
        <EmptyState
          title="No projects match"
          description={projectsWithDates.length === 0 ? 'Projects need start/end dates to appear on the timeline.' : 'Try adjusting your filters.'}
          action={hasActiveFilters ? { label: 'Clear filters', onClick: clearFilters } : undefined}
        />
      ) : (
        <div className="flex-1 overflow-auto" ref={scrollRef}>
          <div style={{ minWidth: LEFT_W + yearCount * YEAR_W }}>
            {/* Year headers */}
            <div className="sticky top-0 z-10 bg-[var(--c-white)] border-b border-[var(--c-gray-200)] flex">
              <div className="shrink-0" style={{ width: LEFT_W }} />
              {years.map((y) => (
                <div
                  key={y}
                  className="text-[10px] font-[500] text-[var(--c-gray-400)] text-center py-2"
                  style={{ width: YEAR_W }}
                >
                  {y}
                </div>
              ))}
            </div>

            {/* Project rows */}
            {sorted.map((p) => {
              const startOffset = ((p.start || minYear) - minYear) * YEAR_W
              const duration = ((p.end || p.start || minYear) - (p.start || minYear) + 1) * YEAR_W
              const color = UNIT_COLORS[p.section] || '#94a3b8'
              const isHovered = hoveredId === p.id

              return (
                <div
                  key={p.id}
                  className="flex items-center border-b border-[var(--c-gray-50)] hover:bg-[var(--c-gray-50)] transition-colors cursor-pointer"
                  style={{ height: ROW_H }}
                  onClick={() => router.push(`/project/${p.id}`)}
                  onMouseEnter={() => setHoveredId(p.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  <div
                    className="shrink-0 px-3 truncate text-[11px] font-[400] text-[var(--c-gray-600)]"
                    style={{ width: LEFT_W }}
                    title={`${p.client} — ${p.projectName}`}
                  >
                    <span className="font-[500] text-[var(--c-gray-800)]">{p.client}</span>
                    <span className="text-[var(--c-gray-400)]"> — {p.projectName}</span>
                  </div>
                  <div className="relative flex-1" style={{ height: ROW_H }}>
                    <div
                      className="absolute top-1 rounded-[2px] transition-opacity duration-150"
                      style={{
                        left: startOffset,
                        width: Math.max(duration, 8),
                        height: ROW_H - 8,
                        backgroundColor: color,
                        opacity: isHovered ? 1 : 0.6,
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
    </MobileOnlyNotice>
  )
}
