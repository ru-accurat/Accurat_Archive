'use client'

import type { Project } from '@/lib/types'
import { InlineEditableArray } from '@/components/edit/InlineEditableArray'

interface Props {
  project: Project
  onUpdate: (field: keyof Project, value: unknown) => Promise<void>
}

export function ProjectLinksSection({ project, onUpdate }: Props) {
  const urls = (project.urls || []).filter(Boolean)
  return (
    <div>
      <h3 className="text-[10px] font-[500] uppercase tracking-[0.1em] text-[var(--c-gray-400)] mb-3">Links</h3>
      {urls.length > 0 && (
        <ul className="space-y-1 mb-3">
          {urls.map((u) => (
            <li key={u}>
              <a
                href={u}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[13px] text-[var(--c-gray-700)] hover:text-[var(--c-gray-900)] underline underline-offset-2 break-all"
              >
                {u}
              </a>
            </li>
          ))}
        </ul>
      )}
      <InlineEditableArray
        values={project.urls || []}
        onSave={(next) => onUpdate('urls', next)}
        placeholder="Add URL…"
      />
    </div>
  )
}
