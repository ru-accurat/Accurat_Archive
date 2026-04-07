'use client'

import type { Project, MediaFile } from '@/lib/types'
import { HeroSection } from '@/components/project/HeroSection'
import { InlineEditableField } from '@/components/edit/InlineEditableField'

interface ProjectHeroProps {
  project: Project
  heroMedia: MediaFile | null
  onUpdate: (field: keyof Project, value: unknown) => Promise<void>
}

function relativeTime(iso?: string): string | null {
  if (!iso) return null
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return null
  const diffMs = Date.now() - then
  const sec = Math.max(0, Math.floor(diffMs / 1000))
  if (sec < 60) return 'just now'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min} minute${min === 1 ? '' : 's'} ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} hour${hr === 1 ? '' : 's'} ago`
  const day = Math.floor(hr / 24)
  if (day < 30) return `${day} day${day === 1 ? '' : 's'} ago`
  const mo = Math.floor(day / 30)
  if (mo < 12) return `${mo} month${mo === 1 ? '' : 's'} ago`
  const yr = Math.floor(mo / 12)
  return `${yr} year${yr === 1 ? '' : 's'} ago`
}

export function ProjectHero({ project, heroMedia, onUpdate }: ProjectHeroProps) {
  const lastEdited = relativeTime(project.updatedAt)
  return (
    <>
      <HeroSection media={heroMedia} folderName={project.folderName} projectName={project.projectName} />
      <div className="max-w-[1040px] px-4 sm:px-6 md:px-[48px] pt-16 pb-6">
        {lastEdited && (
          <div className="mb-2">
            <span
              className="inline-flex items-center gap-1.5 text-[10px] font-[450] uppercase tracking-[0.08em] text-[var(--c-gray-400)]"
              title={project.updatedAt}
            >
              <span className="h-1 w-1 rounded-full bg-[var(--c-gray-400)]" />
              Last edited {lastEdited}
            </span>
          </div>
        )}
        <div className="mb-3">
          <InlineEditableField
            value={project.projectName}
            onSave={(v) => onUpdate('projectName', v)}
            placeholder="Project name"
            multiline={false}
            large
            dark
            className="[&_button]:text-[1.8rem] [&_button]:sm:text-[2.2rem] [&_button]:md:text-[2.8rem] [&_button]:font-[250] [&_button]:tracking-[-0.03em] [&_button]:leading-[1.1] [&_textarea]:text-[1.8rem] [&_textarea]:sm:text-[2.2rem] [&_textarea]:md:text-[2.8rem] [&_textarea]:font-[250] [&_textarea]:tracking-[-0.03em] [&_textarea]:leading-[1.1]"
          />
        </div>
      </div>
    </>
  )
}
