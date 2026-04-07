'use client'

import { useState } from 'react'
import type { Project, MediaFile } from '@/lib/types'
import { HeroSection } from '@/components/project/HeroSection'
import { InlineEditableField } from '@/components/edit/InlineEditableField'
import { api } from '@/lib/api-client'
import { toast } from '@/lib/toast'

interface ProjectHeroProps {
  project: Project
  heroMedia: MediaFile | null
  onUpdate: (field: keyof Project, value: unknown) => Promise<void>
  onPublished?: () => void
}

export function ProjectHero({ project, heroMedia, onUpdate, onPublished }: ProjectHeroProps) {
  const [publishing, setPublishing] = useState(false)

  const handlePublish = async () => {
    if (publishing) return
    setPublishing(true)
    try {
      await api.publishProject(project.id)
      toast.success('Published')
      onPublished?.()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to publish')
    } finally {
      setPublishing(false)
    }
  }

  const hasUnpublished = project.hasUnpublishedChanges
  const neverPublished = !project.publishedAt

  return (
    <>
      <HeroSection media={heroMedia} folderName={project.folderName} projectName={project.projectName} />
      <div className="max-w-[1040px] px-4 sm:px-6 md:px-[48px] pt-16 pb-6">
        <div className="mb-3 flex items-start justify-between gap-4">
          <InlineEditableField
            value={project.projectName}
            onSave={(v) => onUpdate('projectName', v)}
            placeholder="Project name"
            multiline={false}
            large
            dark
            className="[&_button]:text-[1.8rem] [&_button]:sm:text-[2.2rem] [&_button]:md:text-[2.8rem] [&_button]:font-[250] [&_button]:tracking-[-0.03em] [&_button]:leading-[1.1] [&_textarea]:text-[1.8rem] [&_textarea]:sm:text-[2.2rem] [&_textarea]:md:text-[2.8rem] [&_textarea]:font-[250] [&_textarea]:tracking-[-0.03em] [&_textarea]:leading-[1.1]"
          />
          <div className="flex items-center gap-2 shrink-0">
            {hasUnpublished && (
              <span className="text-xs px-2 py-1 rounded bg-amber-500/20 text-amber-200 border border-amber-500/30">
                Has unpublished changes
              </span>
            )}
            <button
              type="button"
              onClick={handlePublish}
              disabled={publishing}
              className="text-xs px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 text-white border border-white/20 disabled:opacity-50"
            >
              {publishing ? 'Publishing…' : neverPublished ? 'Publish' : hasUnpublished ? 'Publish changes' : 'Re-publish'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
