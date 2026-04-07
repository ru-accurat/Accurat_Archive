'use client'

import type { Project } from '@/lib/types'
import { InlineEditableField } from '@/components/edit/InlineEditableField'

interface Props {
  project: Project
  onUpdate: (field: keyof Project, value: unknown) => Promise<void>
}

export function ProjectDescriptions({ project, onUpdate }: Props) {
  const isAi = (f: string) => project.aiGenerated?.includes(f) || false

  return (
    <>
      <div className="bg-[var(--c-white)]">
        <div className="max-w-[1040px] px-4 sm:px-6 md:px-[48px] pt-16 pb-12 space-y-10">
          <InlineEditableField
            title="Tagline"
            value={project.tagline}
            onSave={(v) => onUpdate('tagline', v)}
            placeholder="Add a tagline…"
            large
            isAiGenerated={isAi('tagline')}
          />
          <InlineEditableField
            title="Description"
            value={project.description}
            onSave={(v) => onUpdate('description', v)}
            placeholder="Add a description…"
            isAiGenerated={isAi('description')}
          />
        </div>
      </div>

      <div className="bg-[var(--c-white)]">
        <div className="max-w-[1040px] px-4 sm:px-6 md:px-[48px] py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16">
            <InlineEditableField
              title="Challenge"
              value={project.challenge}
              onSave={(v) => onUpdate('challenge', v)}
              placeholder="Describe the challenge…"
              isAiGenerated={isAi('challenge')}
            />
            <InlineEditableField
              title="Solution"
              value={project.solution}
              onSave={(v) => onUpdate('solution', v)}
              placeholder="Describe the solution…"
              isAiGenerated={isAi('solution')}
            />
          </div>
        </div>
      </div>

      <div className="bg-[var(--c-white)]">
        <div className="max-w-[1040px] px-4 sm:px-6 md:px-[48px] py-12">
          <InlineEditableField
            title="Deliverables"
            value={project.deliverables}
            onSave={(v) => onUpdate('deliverables', v)}
            placeholder="List deliverables…"
            isAiGenerated={isAi('deliverables')}
          />
        </div>
      </div>

      <div className="bg-[var(--c-black)]">
        <div className="max-w-[1040px] px-4 sm:px-6 md:px-[48px] py-12">
          <InlineEditableField
            title="Client Quote"
            value={project.clientQuotes}
            onSave={(v) => onUpdate('clientQuotes', v)}
            placeholder="Add a client quote…"
            large
            dark
            isAiGenerated={isAi('clientQuotes')}
          />
        </div>
      </div>
    </>
  )
}
