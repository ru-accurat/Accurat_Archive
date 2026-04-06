'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api-client'
import { useProjectStore } from '@/stores/project-store'
import { useUiStore } from '@/stores/ui-store'
import { useFilteredProjects, useFilterOptions } from '@/hooks/use-filters'
import { getCompletenessFromSummary } from '@/lib/completeness'
import { CompletenessIndicator } from './CompletenessIndicator'
import { formatYearRange } from '@/lib/format'

const cellInputClass =
  'w-full bg-transparent border-b border-[var(--c-gray-200)] focus:border-[var(--c-gray-900)] focus:outline-none text-[13px] font-[400] text-[var(--c-gray-800)] py-0.5 px-0'
const cellSelectClass =
  'w-full bg-transparent border-b border-[var(--c-gray-200)] focus:border-[var(--c-gray-900)] focus:outline-none text-[13px] font-[400] text-[var(--c-gray-800)] py-0.5 px-0 appearance-none cursor-pointer'

export function ProjectTable() {
  const router = useRouter()
  const filteredProjects = useFilteredProjects()
  const { sortField, sortDirection, setSort, selectedIds, toggleSelection, selectAll, clearSelection, updateProject } =
    useProjectStore()
  const { editMode } = useUiStore()
  const options = useFilterOptions()
  const [saving, setSaving] = useState<string | null>(null)
  const [mediaMap, setMediaMap] = useState<Record<string, { header: string | null; thumb: string | null; first: string | null }>>({})

  useEffect(() => {
    api.getAllSpecialMedia().then(setMediaMap).catch(() => {})
  }, [])

  const allSelected = filteredProjects.length > 0 && filteredProjects.every((p) => selectedIds.includes(p.id))

  const handleSelectAll = () => {
    if (allSelected) {
      clearSelection()
    } else {
      selectAll(filteredProjects.map((p) => p.id))
    }
  }

  const saveField = useCallback(
    async (projectId: string, field: string, value: unknown) => {
      setSaving(projectId)
      try {
        await api.updateProject(projectId, { [field]: value })
        updateProject(projectId, { [field]: value })
      } catch (err) {
        console.error('Failed to save:', err)
      }
      setSaving(null)
    },
    [updateProject]
  )

  const columns = [
    { key: 'client', label: 'Client', width: '18%' },
    { key: 'projectName', label: 'Project', width: '20%' },
    { key: 'section', label: 'Unit', width: '8%' },
    { key: 'tier', label: 'Tier', width: '6%' },
    { key: 'year', label: 'Year', width: '10%' },
    { key: 'output', label: 'Category', width: '20%' },
    { key: 'completeness', label: 'Complete', width: '14%' }
  ]

  const thPad = (i: number) =>
    `${i === 0 ? 'pl-[20px]' : 'pl-[20px]'} ${i === columns.length - 1 ? 'pr-[48px]' : 'pr-[20px]'}`

  const tdPad = (i: number) =>
    `${i === 0 ? 'pl-[20px]' : 'pl-[20px]'} ${i === columns.length - 1 ? 'pr-[48px]' : 'pr-[20px]'}`

  return (
    <div className="h-full overflow-auto">
      <table className="w-full text-[13px] min-w-[800px]">
        <thead className="sticky top-0 bg-[var(--c-white)] z-10">
          <tr className="border-b border-[var(--c-gray-900)]">
            {/* Checkbox column */}
            <th className="w-[44px] pl-[48px] pr-0 py-3">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={handleSelectAll}
                className="w-3.5 h-3.5 rounded-[2px] border-[var(--c-gray-300)] text-[var(--c-gray-900)] focus:ring-[var(--c-gray-400)] focus:ring-1 cursor-pointer"
              />
            </th>
            {columns.map((col, i) => (
              <th
                key={col.key}
                className={`text-left py-3 text-[10px] font-[500] uppercase tracking-[0.1em] text-[var(--c-gray-500)] cursor-pointer hover:text-[var(--c-gray-900)] select-none transition-colors duration-200 ${thPad(i)}`}
                style={{ width: col.width }}
                onClick={() => setSort(col.key)}
              >
                <span className="flex items-center gap-1.5">
                  {col.label}
                  {sortField === col.key && (
                    <span className="text-[var(--c-gray-900)]">
                      {sortDirection === 'asc' ? '\u2191' : '\u2193'}
                    </span>
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filteredProjects.map((project) => {
            const completeness = getCompletenessFromSummary(project)
            const isSelected = selectedIds.includes(project.id)
            const isSaving = saving === project.id
            const special = mediaMap[project.folderName]
            const hasMedia = !!(special?.first || special?.header || special?.thumb)
            const hasDescription = !!project.description
            return (
              <tr
                key={project.id}
                className={`group transition-colors duration-150 ${editMode ? '' : 'cursor-pointer'} ${isSelected ? 'bg-[var(--c-gray-50)]' : 'hover:bg-[var(--c-gray-50)]'} ${isSaving ? 'opacity-60' : ''}`}
                onClick={editMode ? undefined : () => router.push(`/project/${project.id}`)}
              >
                <td className="pl-[48px] pr-0 py-3.5" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelection(project.id)}
                    className="w-3.5 h-3.5 rounded-[2px] border-[var(--c-gray-300)] text-[var(--c-gray-900)] focus:ring-[var(--c-gray-400)] focus:ring-1 cursor-pointer"
                  />
                </td>

                {/* Client */}
                <td className={`py-3.5 font-[500] text-[var(--c-gray-900)] text-[13px] ${tdPad(0)}`}>
                  {editMode ? (
                    <input
                      type="text"
                      defaultValue={project.client}
                      onBlur={(e) => {
                        if (e.target.value !== project.client) saveField(project.id, 'client', e.target.value)
                      }}
                      className={cellInputClass + ' font-[500]'}
                    />
                  ) : (
                    <span className="flex items-center gap-1.5">
                      {project.client}
                      {(!hasDescription || !hasMedia) && (
                        <span className="flex gap-0.5 ml-0.5">
                          {!hasDescription && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Missing description" />}
                          {!hasMedia && <span className="w-1.5 h-1.5 rounded-full bg-rose-400" title="Missing media" />}
                        </span>
                      )}
                    </span>
                  )}
                </td>

                {/* Project Name */}
                <td className={`py-3.5 text-[var(--c-gray-500)] font-[400] text-[13px] ${tdPad(1)}`}>
                  {editMode ? (
                    <input
                      type="text"
                      defaultValue={project.projectName}
                      onBlur={(e) => {
                        if (e.target.value !== project.projectName)
                          saveField(project.id, 'projectName', e.target.value)
                      }}
                      className={cellInputClass}
                    />
                  ) : (
                    project.projectName
                  )}
                </td>

                {/* Unit (section) */}
                <td className={`py-3.5 ${tdPad(2)}`}>
                  {editMode ? (
                    <select
                      defaultValue={project.section}
                      onChange={(e) => saveField(project.id, 'section', e.target.value)}
                      className={cellSelectClass + ' text-[11px]'}
                    >
                      <option value="">—</option>
                      <option value="Studio">Studio</option>
                      <option value="Tech">Tech</option>
                      <option value="Studio, Tech">Studio, Tech</option>
                    </select>
                  ) : project.section ? (
                    <span className="text-[10px] font-[450] tracking-[0.04em] uppercase text-[var(--c-gray-500)]">
                      {project.section}
                    </span>
                  ) : (
                    <span className="text-[var(--c-gray-300)]">&mdash;</span>
                  )}
                </td>

                {/* Tier */}
                <td className={`py-3.5 ${tdPad(3)}`}>
                  {editMode ? (
                    <select
                      defaultValue={project.tier}
                      onChange={(e) => saveField(project.id, 'tier', parseInt(e.target.value))}
                      className={cellSelectClass + ' text-[11px]'}
                    >
                      <option value={1}>1</option>
                      <option value={2}>2</option>
                      <option value={3}>3</option>
                    </select>
                  ) : (
                    <span className="text-[10px] font-[400] tracking-[0.04em] text-[var(--c-gray-400)] uppercase">
                      {project.tier}
                    </span>
                  )}
                </td>

                {/* Year */}
                <td className={`py-3.5 text-[var(--c-gray-500)] font-[400] text-[13px] tabular-nums ${tdPad(4)}`}>
                  {editMode ? (
                    <div className="flex gap-1 items-center">
                      <input
                        type="number"
                        defaultValue={project.start ?? ''}
                        placeholder="Start"
                        onBlur={(e) => {
                          const val = e.target.value ? parseInt(e.target.value) : null
                          if (val !== project.start) saveField(project.id, 'start', val)
                        }}
                        className={cellInputClass + ' w-[52px] tabular-nums text-[12px]'}
                      />
                      <span className="text-[var(--c-gray-300)]">–</span>
                      <input
                        type="number"
                        defaultValue={project.end ?? ''}
                        placeholder="End"
                        onBlur={(e) => {
                          const val = e.target.value ? parseInt(e.target.value) : null
                          if (val !== project.end) saveField(project.id, 'end', val)
                        }}
                        className={cellInputClass + ' w-[52px] tabular-nums text-[12px]'}
                      />
                    </div>
                  ) : (
                    formatYearRange(project.start, project.end)
                  )}
                </td>

                {/* Category (output) */}
                <td className={`py-3.5 text-[12px] text-[var(--c-gray-400)] font-[400] ${tdPad(5)}`}>
                  {editMode ? (
                    <select
                      defaultValue={project.output}
                      onChange={(e) => saveField(project.id, 'output', e.target.value)}
                      className={cellSelectClass + ' text-[12px]'}
                    >
                      <option value="">—</option>
                      {options.outputs.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  ) : (
                    project.output || <span className="text-[var(--c-gray-300)]">&mdash;</span>
                  )}
                </td>

                {/* Completeness */}
                <td className={`py-3.5 ${tdPad(6)}`}>
                  <CompletenessIndicator percentage={completeness.percentage} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {filteredProjects.length === 0 && (
        <div className="flex items-center justify-center h-40 text-[var(--c-gray-400)] text-[13px] font-[350]">
          No projects match your filters
        </div>
      )}

      <div className="px-4 sm:px-6 md:px-[48px] py-4 text-[11px] text-[var(--c-gray-400)] font-[400]">
        {filteredProjects.length} project{filteredProjects.length !== 1 ? 's' : ''}
      </div>
    </div>
  )
}
