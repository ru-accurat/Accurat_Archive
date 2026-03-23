'use client'

import { useState, useMemo } from 'react'
import { useProjectStore } from '@/stores/project-store'
import type { Project } from '@/lib/types'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

function thumbUrl(folderName: string, image?: string) {
  if (!image) return null
  return `${SUPABASE_URL}/storage/v1/object/public/project-media/${folderName}/${image}`
}

interface Props {
  open: boolean
  onClose: () => void
  collectionId: string
  existingProjectIds: Set<string>
  onAdded: (projects: Project[]) => void
  groupId?: string | null
}

export function ProjectSearchPicker({ open, onClose, collectionId, existingProjectIds, onAdded, groupId }: Props) {
  const allProjects = useProjectStore((s) => s.projects)
  const [search, setSearch] = useState('')
  const [adding, setAdding] = useState<Set<string>>(new Set())

  const results = useMemo(() => {
    if (!search.trim()) return []
    const q = search.toLowerCase()
    return allProjects
      .filter((p) =>
        !existingProjectIds.has(p.id) &&
        (p.client.toLowerCase().includes(q) ||
         p.projectName.toLowerCase().includes(q) ||
         p.fullName.toLowerCase().includes(q))
      )
      .slice(0, 20)
  }, [allProjects, search, existingProjectIds])

  const handleAdd = async (project: Project) => {
    setAdding((prev) => new Set(prev).add(project.id))
    try {
      await fetch(`/api/collections/${collectionId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectIds: [project.id], groupId: groupId || undefined }),
      })
      onAdded([project])
    } catch {
      // silently fail
    } finally {
      setAdding((prev) => {
        const next = new Set(prev)
        next.delete(project.id)
        return next
      })
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-[var(--c-white)] rounded-[var(--radius-lg)] w-[90%] max-w-[520px] max-h-[70vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--c-gray-100)]">
          <h2 className="text-[1rem] font-[400] tracking-[-0.01em] text-[var(--c-gray-900)]">
            Add Projects
          </h2>
          <button
            onClick={() => { onClose(); setSearch('') }}
            className="text-[var(--c-gray-400)] hover:text-[var(--c-gray-900)] transition-colors p-1"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-3 border-b border-[var(--c-gray-100)]">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by client or project name..."
            autoFocus
            className="w-full text-[13px] font-[400] text-[var(--c-gray-700)] placeholder:text-[var(--c-gray-300)] bg-transparent outline-none"
          />
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto px-3 py-2">
          {!search.trim() ? (
            <p className="text-[12px] text-[var(--c-gray-400)] px-3 py-4 text-center">
              Type to search projects
            </p>
          ) : results.length === 0 ? (
            <p className="text-[12px] text-[var(--c-gray-400)] px-3 py-4 text-center">
              No matching projects found
            </p>
          ) : (
            results.map((p) => {
              const img = thumbUrl(p.folderName, p.thumbImage || p.heroImage)
              const isAdding = adding.has(p.id)
              return (
                <div
                  key={p.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-sm)] hover:bg-[var(--c-gray-50)] transition-colors"
                >
                  <div className="w-10 h-10 rounded-[3px] overflow-hidden bg-[var(--c-gray-100)] shrink-0">
                    {img ? (
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-[500] text-[var(--c-gray-800)] truncate">{p.client}</p>
                    <p className="text-[11px] font-[350] text-[var(--c-gray-500)] truncate">{p.projectName}</p>
                  </div>
                  <button
                    onClick={() => handleAdd(p)}
                    disabled={isAdding}
                    className="text-[11px] font-[450] px-3 py-1 rounded-[var(--radius-sm)] bg-[var(--c-gray-900)] text-white hover:bg-[var(--c-gray-800)] transition-colors disabled:opacity-30 shrink-0"
                  >
                    {isAdding ? 'Adding...' : 'Add'}
                  </button>
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[var(--c-gray-100)]">
          <button
            onClick={() => { onClose(); setSearch('') }}
            className="text-[12px] font-[400] text-[var(--c-gray-500)] hover:text-[var(--c-gray-900)] transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
