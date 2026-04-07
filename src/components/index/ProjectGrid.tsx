'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { api } from '@/lib/api-client'
import { useFilteredProjectsWithMatches } from '@/hooks/use-filters'
import { useProjectStore } from '@/stores/project-store'
import { Highlight } from '@/components/shared/Highlight'

const HIGHLIGHT_FIELDS = new Set(['client', 'projectName', 'fullName'])

type SpecialMediaMap = Record<string, { header: string | null; thumb: string | null; first: string | null }>

export function ProjectGrid() {
  const router = useRouter()
  const { projects: filteredProjects, matches } = useFilteredProjectsWithMatches()
  const search = useProjectStore((s) => s.filters.search)
  const [specialMedia, setSpecialMedia] = useState<SpecialMediaMap>({})
  const { selectedIds } = useProjectStore()
  const toggleSelection = useProjectStore((s) => s.toggleSelection)
  const selectedSet = new Set(selectedIds)
  const hasAnySelected = selectedIds.length > 0

  useEffect(() => {
    api.getAllSpecialMedia().then(setSpecialMedia).catch(() => {})
  }, [])

  const handleClick = useCallback((projectId: string, e: React.MouseEvent) => {
    if (hasAnySelected || e.metaKey || e.ctrlKey) {
      // Selection mode: toggle this project
      e.preventDefault()
      toggleSelection(projectId)
    } else {
      router.push(`/project/${projectId}`)
    }
  }, [hasAnySelected, toggleSelection, router])

  return (
    <div className="h-full overflow-auto">
      <div
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}
        className="grid gap-5 px-4 sm:px-6 md:px-[48px] pt-5 pb-12"
      >
        {filteredProjects.map((project) => {
          const special = specialMedia[project.folderName]
          const heroSrc = special?.thumb || special?.header || special?.first || null
          const hasMedia = !!(special?.first || special?.header || special?.thumb)
          const hasDescription = !!project.description
          const isSelected = selectedSet.has(project.id)

          return (
            <div
              key={project.id}
              onClick={(e) => handleClick(project.id, e)}
              className={`group cursor-pointer relative ${isSelected ? 'ring-2 ring-[var(--c-accent)] rounded-[var(--radius-sm)]' : ''}`}
            >
              {/* Selection checkbox */}
              <div
                className={`absolute top-2 left-2 z-10 w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                  isSelected
                    ? 'bg-[var(--c-accent)] text-white opacity-100'
                    : hasAnySelected
                      ? 'bg-black/40 text-white/60 opacity-100'
                      : 'bg-black/40 text-white/60 opacity-0 group-hover:opacity-100'
                }`}
                onClick={(e) => { e.stopPropagation(); toggleSelection(project.id) }}
              >
                {isSelected && (
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                    <path d="M3 6l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>

              {/* Thumbnail */}
              <div className="aspect-[16/10] bg-[var(--c-gray-100)] overflow-hidden mb-3 relative">
                {heroSrc ? (
                  <Image
                    src={heroSrc}
                    alt={project.projectName}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 240px"
                    className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[var(--c-gray-300)]">
                    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                      <rect x="4" y="6" width="24" height="20" rx="2" stroke="currentColor" strokeWidth="1.5" />
                      <circle cx="12" cy="14" r="3" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M4 22l7-5 4 3 5-4 8 6" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex items-center gap-1.5 text-[12px] font-[500] text-[var(--c-gray-900)] leading-tight mb-0.5 group-hover:text-[var(--c-gray-700)] transition-colors duration-150">
                <Highlight text={project.client} match={search} />
                {(!hasDescription || !hasMedia) && (
                  <span className="flex gap-0.5">
                    {!hasDescription && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Missing description" />}
                    {!hasMedia && <span className="w-1.5 h-1.5 rounded-full bg-rose-400" title="Missing media" />}
                  </span>
                )}
              </div>
              <div className="text-[11px] font-[400] text-[var(--c-gray-500)] leading-tight line-clamp-2">
                <Highlight text={project.projectName} match={search} />
              </div>
              {search && matches.get(project.id) && !HIGHLIGHT_FIELDS.has(matches.get(project.id)!) && (
                <div className="text-[9px] font-[450] uppercase tracking-[0.06em] text-[var(--c-gray-400)] mt-1 inline-block bg-[var(--c-gray-100)] px-1.5 py-0.5 rounded-sm">
                  matched: {matches.get(project.id)}
                </div>
              )}
              {project.section && (
                <div className="text-[9px] font-[450] uppercase tracking-[0.08em] text-[var(--c-gray-400)] mt-1">
                  {project.section}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {filteredProjects.length === 0 && (
        <div className="flex items-center justify-center h-40 text-[var(--c-gray-400)] text-[13px] font-[350]">
          No projects match your filters
        </div>
      )}

      <div className="px-4 sm:px-6 md:px-[48px] py-4 text-[11px] text-[var(--c-gray-400)] font-[400]">
        {filteredProjects.length} project{filteredProjects.length !== 1 ? 's' : ''}
      </div>
    </div>
  )
}
