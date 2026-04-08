'use client'

import type { Project } from '@/lib/types'
import { InlineEditableArray } from '@/components/edit/InlineEditableArray'
import { SuggestedTags } from '@/components/edit/SuggestedTags'

interface Props {
  project: Project
  onUpdate: (field: keyof Project, value: unknown) => Promise<void>
  dark?: boolean
  availableDomains?: string[]
  availableServices?: string[]
}

export function ProjectTagsSection({
  project,
  onUpdate,
  dark = false,
  availableDomains = [],
  availableServices = [],
}: Props) {
  const addDomain = (tag: string) => {
    if (project.domains.some((d) => d.toLowerCase() === tag.toLowerCase())) return
    onUpdate('domains', [...project.domains, tag])
  }
  const addService = (tag: string) => {
    if (project.services.some((s) => s.toLowerCase() === tag.toLowerCase())) return
    onUpdate('services', [...project.services, tag])
  }
  const setOutput = (value: string) => {
    onUpdate('output', value)
  }

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
      <SuggestedTags
        description={project.description || ''}
        currentDomains={project.domains}
        currentServices={project.services}
        currentOutput={project.output || ''}
        availableDomains={availableDomains}
        availableServices={availableServices}
        onAddDomain={addDomain}
        onAddService={addService}
        onSetOutput={setOutput}
        dark={dark}
      />
    </div>
  )
}
