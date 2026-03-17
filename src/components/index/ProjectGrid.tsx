'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api-client'
import { useFilteredProjects } from '@/hooks/use-filters'

type SpecialMediaMap = Record<string, { header: string | null; thumb: string | null; first: string | null }>

export function ProjectGrid() {
  const router = useRouter()
  const filteredProjects = useFilteredProjects()
  const [specialMedia, setSpecialMedia] = useState<SpecialMediaMap>({})

  useEffect(() => {
    api.getAllSpecialMedia().then(setSpecialMedia).catch(() => {})
  }, [])

  return (
    <div className="h-full overflow-auto">
      <div
        className="grid gap-5"
        style={{
          padding: '20px 48px 48px',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))'
        }}
      >
        {filteredProjects.map((project) => {
          const special = specialMedia[project.folderName]
          // Special media values are already full URLs from the API
          const heroSrc = special?.thumb || special?.header || special?.first || null
          const hasMedia = !!(special?.first || special?.header || special?.thumb)
          const hasDescription = !!project.description

          return (
            <div
              key={project.id}
              onClick={() => router.push(`/project/${project.id}`)}
              className="group cursor-pointer"
            >
              {/* Thumbnail */}
              <div className="aspect-[16/10] bg-[var(--c-gray-100)] overflow-hidden mb-3">
                {heroSrc ? (
                  <img
                    src={heroSrc}
                    alt={project.projectName}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
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
                {project.client}
                {(!hasDescription || !hasMedia) && (
                  <span className="flex gap-0.5">
                    {!hasDescription && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Missing description" />}
                    {!hasMedia && <span className="w-1.5 h-1.5 rounded-full bg-rose-400" title="Missing media" />}
                  </span>
                )}
              </div>
              <div className="text-[11px] font-[400] text-[var(--c-gray-500)] leading-tight truncate">
                {project.projectName}
              </div>
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

      <div className="px-[48px] py-4 text-[11px] text-[var(--c-gray-400)] font-[400]">
        {filteredProjects.length} project{filteredProjects.length !== 1 ? 's' : ''}
      </div>
    </div>
  )
}
