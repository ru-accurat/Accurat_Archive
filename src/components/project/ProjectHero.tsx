'use client'

import type { Project, MediaFile } from '@/lib/types'
import { HeroSection } from '@/components/project/HeroSection'
import { InlineEditableField } from '@/components/edit/InlineEditableField'

interface ProjectHeroProps {
  project: Project
  heroMedia: MediaFile | null
  onUpdate: (field: keyof Project, value: unknown) => Promise<void>
}

export function ProjectHero({ project, heroMedia, onUpdate }: ProjectHeroProps) {
  return (
    <>
      <HeroSection media={heroMedia} folderName={project.folderName} projectName={project.projectName} />
      <div className="max-w-[1040px] px-4 sm:px-6 md:px-[48px] pt-16 pb-6">
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
