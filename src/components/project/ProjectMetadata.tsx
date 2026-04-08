'use client'

import { useState } from 'react'
import type { Project } from '@/lib/types'
import { InlineEditCell } from '@/components/shared/InlineEditCell'
import { LocationAutocomplete } from '@/components/edit/LocationAutocomplete'

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
      <div className="min-w-[120px]">
        <InlineEditCell
          value={project.client2 || ''}
          onSave={(v) => onUpdate('client2', v || null)}
          placeholder="+ Client 2"
          className="!text-[13px] !text-white/60 !font-[400] !bg-transparent hover:!bg-white/5"
        />
      </div>
      <div className="min-w-[120px]">
        <InlineEditCell
          value={project.agency || ''}
          onSave={(v) => onUpdate('agency', v || null)}
          placeholder="+ Agency"
          className="!text-[13px] !text-white/60 !font-[400] !bg-transparent hover:!bg-white/5"
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
        <LocationInlineEdit project={project} onUpdate={onUpdate} />
      </div>
    </div>
  )
}

function LocationInlineEdit({
  project,
  onUpdate,
}: {
  project: Project
  onUpdate: (field: keyof Project, value: unknown) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const display = project.locationName || 'Location'

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className={`text-left text-[12px] px-2 py-1 rounded-[var(--radius-sm)] hover:bg-white/5 transition-colors w-full ${
          project.locationName ? 'text-white/50' : 'text-white/30'
        }`}
      >
        {display}
      </button>
    )
  }

  return (
    <div onBlur={(e) => {
      // Close when focus leaves the wrapper
      if (!e.currentTarget.contains(e.relatedTarget as Node)) {
        setTimeout(() => setEditing(false), 200)
      }
    }}>
      <LocationAutocomplete
        locationName={project.locationName || ''}
        autoFocus
        inputClassName="text-[12px] bg-white border border-[var(--c-gray-300)] rounded-[var(--radius-sm)] px-2 py-1 outline-none focus:border-[var(--c-gray-900)] w-full text-[var(--c-gray-800)]"
        onSelect={async (name, lat, lon) => {
          await onUpdate('locationName', name)
          await onUpdate('latitude', lat)
          await onUpdate('longitude', lon)
          setEditing(false)
        }}
        onNameChange={async (name) => {
          await onUpdate('locationName', name)
          setEditing(false)
        }}
      />
    </div>
  )
}
