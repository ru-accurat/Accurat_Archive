'use client'

import { useState, useCallback } from 'react'
import { useProjectStore } from '@/stores/project-store'
import { api } from '@/lib/api-client'

const AI_FIELDS = ['tagline', 'description', 'challenge', 'solution', 'deliverables', 'clientQuotes']

interface Props {
  open: boolean
  onClose: () => void
  projectIds: string[]
}

interface FieldStatus {
  status: 'pending' | 'generating' | 'done' | 'error'
  error?: string
}

export function BulkGenerateModal({ open, onClose, projectIds }: Props) {
  const { projects, updateProject } = useProjectStore()
  const selected = projects.filter((p) => projectIds.includes(p.id))

  const [running, setRunning] = useState(false)
  const [currentProject, setCurrentProject] = useState<string | null>(null)
  const [currentField, setCurrentField] = useState<string | null>(null)
  const [progress, setProgress] = useState<Record<string, Record<string, FieldStatus>>>({})
  const [completed, setCompleted] = useState(0)
  const [total, setTotal] = useState(0)

  const getEmptyFields = useCallback(
    (project: (typeof projects)[0]) =>
      AI_FIELDS.filter((f) => !project[f as keyof typeof project]),
    []
  )

  const handleStart = async () => {
    setRunning(true)
    setCompleted(0)

    // Count total fields to generate
    let totalFields = 0
    const initialProgress: Record<string, Record<string, FieldStatus>> = {}
    for (const project of selected) {
      const empty = getEmptyFields(project)
      initialProgress[project.id] = {}
      for (const field of empty) {
        initialProgress[project.id][field] = { status: 'pending' }
        totalFields++
      }
    }
    setTotal(totalFields)
    setProgress(initialProgress)

    let done = 0
    for (const project of selected) {
      const empty = getEmptyFields(project)
      if (empty.length === 0) continue

      setCurrentProject(project.id)

      for (const field of empty) {
        setCurrentField(field)
        setProgress((prev) => ({
          ...prev,
          [project.id]: {
            ...prev[project.id],
            [field]: { status: 'generating' }
          }
        }))

        try {
          const result = await api.generateField(project.id, field)
          if (result.success) {
            // Update project in store
            const updatedData = {
              [field]: result.text,
              aiGenerated: [...new Set([...(project.aiGenerated || []), field])]
            }
            await api.updateProject(project.id, updatedData)
            updateProject(project.id, updatedData)

            setProgress((prev) => ({
              ...prev,
              [project.id]: {
                ...prev[project.id],
                [field]: { status: 'done' }
              }
            }))
          } else {
            setProgress((prev) => ({
              ...prev,
              [project.id]: {
                ...prev[project.id],
                [field]: { status: 'error', error: result.message }
              }
            }))
          }
        } catch (err) {
          setProgress((prev) => ({
            ...prev,
            [project.id]: {
              ...prev[project.id],
              [field]: { status: 'error', error: String(err) }
            }
          }))
        }

        done++
        setCompleted(done)
      }
    }

    setCurrentProject(null)
    setCurrentField(null)
    setRunning(false)
  }

  if (!open) return null

  const totalEmpty = selected.reduce((acc, p) => acc + getEmptyFields(p).length, 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        className="bg-[var(--c-white)] rounded-[var(--radius-lg)] w-[90%] max-w-[700px] max-h-[80vh] flex flex-col"
        style={{ boxShadow: 'var(--shadow-lg)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--c-gray-200)]" style={{ padding: '16px 24px' }}>
          <h3 className="text-[14px] font-[500] text-[var(--c-gray-900)]">
            Bulk AI Generation
          </h3>
          <button
            onClick={onClose}
            disabled={running}
            className="text-[var(--c-gray-400)] hover:text-[var(--c-gray-900)] transition-colors duration-200 disabled:opacity-40"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto" style={{ padding: '24px' }}>
          {!running && completed === 0 && (
            <div className="mb-6">
              <p className="text-[13px] font-[400] text-[var(--c-gray-600)] mb-4">
                Generate missing content for {selected.length} project{selected.length !== 1 ? 's' : ''}.
                {totalEmpty > 0 ? ` ${totalEmpty} empty fields will be generated.` : ' All fields are already filled.'}
              </p>
            </div>
          )}

          {/* Progress */}
          {(running || completed > 0) && (
            <div className="mb-4">
              <div className="flex items-center justify-between text-[12px] font-[400] text-[var(--c-gray-500)] mb-2">
                <span>{running ? 'Generating...' : 'Complete'}</span>
                <span>{completed}/{total}</span>
              </div>
              <div className="w-full h-1.5 bg-[var(--c-gray-100)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--c-ai)] rounded-full transition-all duration-300"
                  style={{ width: total > 0 ? `${(completed / total) * 100}%` : '0%' }}
                />
              </div>
            </div>
          )}

          {/* Project list */}
          <div className="flex flex-col gap-3">
            {selected.map((project) => {
              const empty = getEmptyFields(project)
              const projectProgress = progress[project.id] || {}
              const isCurrent = currentProject === project.id

              return (
                <div
                  key={project.id}
                  className={`rounded-[var(--radius-md)] border ${isCurrent ? 'border-[var(--c-ai)]/30 bg-[var(--c-ai-bg)]' : 'border-[var(--c-gray-200)]'}`}
                  style={{ padding: '12px 16px' }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[13px] font-[500] text-[var(--c-gray-900)]">
                      {project.client} — {project.projectName}
                    </span>
                    <span className="text-[11px] font-[400] text-[var(--c-gray-400)]">
                      {empty.length} empty field{empty.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {empty.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {empty.map((field) => {
                        const fs = projectProgress[field]
                        return (
                          <span
                            key={field}
                            className={`text-[10px] font-[400] px-2 py-0.5 rounded-[2px] ${
                              fs?.status === 'done'
                                ? 'bg-[var(--c-success)]/10 text-[var(--c-success)]'
                                : fs?.status === 'generating'
                                  ? 'bg-[var(--c-ai-bg)] text-[var(--c-ai)]'
                                  : fs?.status === 'error'
                                    ? 'bg-[var(--c-error)]/10 text-[var(--c-error)]'
                                    : 'bg-[var(--c-gray-100)] text-[var(--c-gray-500)]'
                            }`}
                          >
                            {field}
                          </span>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-[var(--c-gray-200)]" style={{ padding: '16px 24px' }}>
          <button
            onClick={onClose}
            disabled={running}
            className="text-[12px] font-[400] px-4 py-2 rounded-[var(--radius-sm)] text-[var(--c-gray-500)] hover:text-[var(--c-gray-900)] transition-colors duration-200 disabled:opacity-40"
          >
            {completed > 0 && !running ? 'Done' : 'Cancel'}
          </button>
          {(!running && completed === 0 && totalEmpty > 0) && (
            <button
              onClick={handleStart}
              className="text-[12px] font-[500] px-5 py-2 rounded-[var(--radius-sm)] bg-[var(--c-gray-900)] text-white hover:bg-[var(--c-gray-800)] transition-colors duration-200"
            >
              Start Generation
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
