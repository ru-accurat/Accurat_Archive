'use client'

import type { Project } from '@/lib/types'
import { InlineEditableArray } from '@/components/edit/InlineEditableArray'

interface Props {
  project: Project
  onUpdate: (field: keyof Project, value: unknown) => Promise<void>
  dark?: boolean
}

export function ProjectTagsSection({ project, onUpdate, dark = false }: Props) {
  return (
    <div className="space-y-4">
      <InlineEditableArray
        title="Domains"
        values={project.domains}
        onSave={(next) => onUpdate('domains', next)}
        placeholder="Add domain…"
        dark={dark}
      />
      <InlineEditableArray
        title="Services"
        values={project.services}
        onSave={(next) => onUpdate('services', next)}
        placeholder="Add service…"
        dark={dark}
      />
      <InlineEditableArray
        title="Team"
        values={project.team}
        onSave={(next) => onUpdate('team', next)}
        placeholder="Add team member…"
        dark={dark}
      />
    </div>
  )
}
