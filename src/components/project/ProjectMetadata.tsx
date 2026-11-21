'use client'

import { useState } from 'react'
import type { Project } from '@/lib/types'
import { InlineEditCell } from '@/components/shared/InlineEditCell'
import { LocationAutocomplete } from '@/components/edit/LocationAutocomplete'
import { parsePartners } from '@/lib/partners'
import { ON_WEBSITE, STATUS_LABELS, STATUS_OPTIONS, isProjectStatus } from '@/lib/status'

interface ProjectMetadataProps {
  project: Project
  onUpdate: (field: keyof Project, value: unknown) => Promise<void>
}

/** Asks before a status change moves a project onto or off the website. */
function confirmStatusChange(project: Project, next: string): boolean {
  if (!isProjectStatus(next) || next === project.status) return true
  const name = `${project.client} - ${project.projectName}`
  const lib = project.deckNo != null ? `Library ${String(project.deckNo).padStart(3, '0')}` : 'the next free Library number'
  if (ON_WEBSITE.has(next) && !ON_WEBSITE.has(project.status)) {
    return confirm(`Set ${name} to ${STATUS_LABELS[next]}?\n\nIt goes on the website${next === 'private' ? ' as confidential' : ''} with ${lib}. It needs selected media with a hero and thumbnail, a category, an offering and "What we made"; if anything is missing, nothing changes.`)
  }
  if (!ON_WEBSITE.has(next) && ON_WEBSITE.has(project.status)) {
    return confirm(`Set ${name} to ${STATUS_LABELS[next]}?\n\nIt leaves the website. Its ${lib} stays reserved for it.`)
  }
  return true
}

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
          value={(project.partners || []).join(', ')}
          onSave={(v) => onUpdate('partners', parsePartners(v))}
          placeholder="+ Partners"
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
      <div className="w-[130px]">
        <InlineEditCell
          value={project.status}
          onSave={async (v) => { if (confirmStatusChange(project, String(v))) await onUpdate('status', v) }}
          formatDisplay={(v) => (isProjectStatus(v) ? STATUS_LABELS[v] : String(v ?? ''))}
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
