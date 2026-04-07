'use client'

import type { Project } from '@/lib/types'
import { InlineEditCell } from '@/components/shared/InlineEditCell'

interface ProjectMetadataProps {
  project: Project
  onUpdate: (field: keyof Project, value: unknown) => Promise<void>
}

const STATUS_OPTIONS = [
  { label: 'Draft', value: 'draft' },
  { label: 'Internal', value: 'internal' },
  { label: 'Public', value: 'public' },
]

const TIER_OPTIONS = [
  { label: 'Tier 1', value: '1' },
  { label: 'Tier 2', value: '2' },
  { label: 'Tier 3', value: '3' },
]

export function ProjectMetadata({ project, onUpdate }: ProjectMetadataProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-white/80">
      <div className="min-w-[120px]">
        <InlineEditCell
          value={project.client}
          onSave={(v) => onUpdate('client', v)}
          placeholder="Client"
          className="!text-[13px] !text-white !font-[500] !bg-transparent hover:!bg-white/5"
        />
      </div>
      <div className="w-[80px]">
        <InlineEditCell
          value={project.start}
          onSave={(v) => onUpdate('start', v ? Number(v) : null)}
          type="number"
          placeholder="Start"
          className="!text-white/50 !bg-transparent hover:!bg-white/5"
        />
      </div>
      <div className="w-[80px]">
        <InlineEditCell
          value={project.end}
          onSave={(v) => onUpdate('end', v ? Number(v) : null)}
          type="number"
          placeholder="End"
          className="!text-white/50 !bg-transparent hover:!bg-white/5"
        />
      </div>
      <div className="w-[120px]">
        <InlineEditCell
          value={project.section}
          onSave={(v) => onUpdate('section', v)}
          placeholder="Section"
          className="!text-white/50 !bg-transparent hover:!bg-white/5 uppercase"
        />
      </div>
      <div className="w-[90px]">
        <InlineEditCell
          value={String(project.tier)}
          onSave={(v) => onUpdate('tier', Number(v))}
          type="select"
          options={TIER_OPTIONS}
          className="!text-white/50 !bg-transparent hover:!bg-white/5"
        />
      </div>
      <div className="w-[140px]">
        <InlineEditCell
          value={project.output}
          onSave={(v) => onUpdate('output', v)}
          placeholder="Output"
          className="!text-white/50 !bg-transparent hover:!bg-white/5"
        />
      </div>
      <div className="w-[110px]">
        <InlineEditCell
          value={project.status}
          onSave={(v) => onUpdate('status', v)}
          type="select"
          options={STATUS_OPTIONS}
          className="!text-white/50 !bg-transparent hover:!bg-white/5 uppercase"
        />
      </div>
      <div className="min-w-[140px] flex-1">
        <InlineEditCell
          value={project.locationName || ''}
          onSave={(v) => onUpdate('locationName', v)}
          placeholder="Location"
          className="!text-white/50 !bg-transparent hover:!bg-white/5"
        />
      </div>
    </div>
  )
}
