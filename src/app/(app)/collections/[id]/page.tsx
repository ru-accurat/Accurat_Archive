'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import type { Project } from '@/lib/types'
import { useProjects } from '@/hooks/use-projects'
import { ProjectSearchPicker } from '@/components/shared/ProjectSearchPicker'
import { Breadcrumb } from '@/components/shared/Breadcrumb'
import { SharePopover } from '@/components/shared/SharePopover'
import { InlineEditCell } from '@/components/shared/InlineEditCell'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

function thumbUrl(folderName: string, image?: string) {
  if (!image) return null
  return `${SUPABASE_URL}/storage/v1/object/public/project-media/${folderName}/${image}`
}

interface CollectionGroup {
  id: string
  name: string
  sortOrder: number
}

interface CollectionDetail {
  id: string
  name: string
  description: string
  shareToken: string | null
  projects: Project[]
  groups: CollectionGroup[]
  itemGroups: Record<string, string | null>
}

export default function CollectionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  useProjects()
  const [collection, setCollection] = useState<CollectionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerGroupId, setPickerGroupId] = useState<string | null>(null)
  const [deleteMode, setDeleteMode] = useState(false)
  const [selectedForDelete, setSelectedForDelete] = useState<Set<string>>(new Set())
  const [batchRemoving, setBatchRemoving] = useState(false)
  const [editMode, setEditMode] = useState(false)

  const loadCollection = useCallback(() => {
    fetch(`/api/collections/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setCollection(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [id])

  useEffect(() => { loadCollection() }, [loadCollection])

  const existingIds = useMemo(
    () => new Set(collection?.projects.map((p) => p.id) || []),
    [collection?.projects]
  )

  // Group projects by their group_id
  const groupedProjects = useMemo(() => {
    if (!collection) return { ungrouped: [], groups: [] }
    const groups = collection.groups || []
    const itemGroups = collection.itemGroups || {}

    const byGroup: Record<string, Project[]> = {}
    const ungrouped: Project[] = []

    for (const p of collection.projects) {
      const gid = itemGroups[p.id]
      if (gid) {
        if (!byGroup[gid]) byGroup[gid] = []
        byGroup[gid].push(p)
      } else {
        ungrouped.push(p)
      }
    }

    return {
      ungrouped,
      groups: groups.map(g => ({
        ...g,
        projects: byGroup[g.id] || [],
      })),
    }
  }, [collection])

  const handleRemove = useCallback(async (projectId: string) => {
    await fetch(`/api/collections/${id}/items`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId }),
    })
    setCollection((prev) =>
      prev ? {
        ...prev,
        projects: prev.projects.filter((p) => p.id !== projectId),
        itemGroups: Object.fromEntries(Object.entries(prev.itemGroups).filter(([k]) => k !== projectId)),
      } : null
    )
  }, [id])

  const handleDelete = useCallback(async () => {
    if (!confirm('Delete this collection?')) return
    await fetch(`/api/collections/${id}`, { method: 'DELETE' })
    router.push('/collections')
  }, [id, router])

  const toggleDeleteSelection = useCallback((projectId: string) => {
    setSelectedForDelete((prev) => {
      const next = new Set(prev)
      if (next.has(projectId)) next.delete(projectId)
      else next.add(projectId)
      return next
    })
  }, [])

  const handleBatchRemove = useCallback(async () => {
    if (selectedForDelete.size === 0) return
    setBatchRemoving(true)
    const ids = Array.from(selectedForDelete)
    await Promise.all(
      ids.map((projectId) =>
        fetch(`/api/collections/${id}/items`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId }),
        })
      )
    )
    setCollection((prev) =>
      prev ? {
        ...prev,
        projects: prev.projects.filter((p) => !selectedForDelete.has(p.id)),
        itemGroups: Object.fromEntries(Object.entries(prev.itemGroups).filter(([k]) => !selectedForDelete.has(k))),
      } : null
    )
    setSelectedForDelete(new Set())
    setDeleteMode(false)
    setBatchRemoving(false)
  }, [id, selectedForDelete])

  const handleProjectsAdded = useCallback((added: Project[]) => {
    setCollection((prev) => {
      if (!prev) return null
      const newItemGroups = { ...prev.itemGroups }
      for (const p of added) {
        newItemGroups[p.id] = pickerGroupId
      }
      return { ...prev, projects: [...prev.projects, ...added], itemGroups: newItemGroups }
    })
  }, [pickerGroupId])

  const handleGenerateShareLink = useCallback(async () => {
    const res = await fetch(`/api/collections/${id}/share-token`, { method: 'POST' })
    const data = await res.json()
    setCollection((prev) => prev ? { ...prev, shareToken: data.token } : null)
  }, [id])

  const handleRevokeShareLink = useCallback(async () => {
    await fetch(`/api/collections/${id}/share-token`, { method: 'DELETE' })
    setCollection((prev) => prev ? { ...prev, shareToken: null } : null)
  }, [id])

  // Group management
  const handleAddGroup = useCallback(async () => {
    const res = await fetch(`/api/collections/${id}/groups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New Group' }),
    })
    const group = await res.json()
    setCollection((prev) => prev ? {
      ...prev,
      groups: [...(prev.groups || []), { id: group.id, name: group.name, sortOrder: group.sort_order }],
    } : null)
  }, [id])

  const handleRenameGroup = useCallback(async (groupId: string, name: string) => {
    await fetch(`/api/collections/${id}/groups/${groupId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    setCollection((prev) => prev ? {
      ...prev,
      groups: prev.groups.map(g => g.id === groupId ? { ...g, name } : g),
    } : null)
  }, [id])

  const handleDeleteGroup = useCallback(async (groupId: string) => {
    await fetch(`/api/collections/${id}/groups/${groupId}`, { method: 'DELETE' })
    setCollection((prev) => {
      if (!prev) return null
      // Move items from deleted group to ungrouped
      const newItemGroups = { ...prev.itemGroups }
      for (const [pid, gid] of Object.entries(newItemGroups)) {
        if (gid === groupId) newItemGroups[pid] = null
      }
      return {
        ...prev,
        groups: prev.groups.filter(g => g.id !== groupId),
        itemGroups: newItemGroups,
      }
    })
  }, [id])

  const handleMoveToGroup = useCallback(async (projectIds: string[], groupId: string | null) => {
    await fetch(`/api/collections/${id}/items`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectIds, groupId }),
    })
    setCollection((prev) => {
      if (!prev) return null
      const newItemGroups = { ...prev.itemGroups }
      for (const pid of projectIds) {
        newItemGroups[pid] = groupId
      }
      return { ...prev, itemGroups: newItemGroups }
    })
  }, [id])

  if (loading) {
    return <div className="flex items-center justify-center h-full bg-[var(--c-white)] text-[var(--c-gray-400)] text-[13px]">Loading...</div>
  }

  if (!collection) {
    return <div className="flex items-center justify-center h-full bg-[var(--c-white)] text-[var(--c-gray-400)] text-[13px]">Collection not found</div>
  }

  const renderProjectCard = (p: Project) => {
    const img = thumbUrl(p.folderName, p.thumbImage || p.heroImage)
    const isSelected = selectedForDelete.has(p.id)
    return (
      <div key={p.id} className="group relative">
        <button
          onClick={() => deleteMode ? toggleDeleteSelection(p.id) : router.push(`/project/${p.id}`)}
          className={`text-left w-full transition-opacity duration-150 ${deleteMode && !isSelected ? 'opacity-60' : ''}`}
        >
          <div className={`aspect-[4/3] rounded-[var(--radius-sm)] overflow-hidden bg-[var(--c-gray-100)] mb-2 ${deleteMode ? 'cursor-pointer' : ''} ${isSelected ? 'ring-2 ring-[var(--c-error)]' : ''}`}>
            {img ? (
              <img src={img} alt={p.projectName} className={`w-full h-full object-cover transition-transform duration-300 ${!deleteMode ? 'group-hover:scale-105' : ''}`} />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[var(--c-gray-300)] text-[10px]">No image</div>
            )}
          </div>
          <p className="text-[12px] font-[500] text-[var(--c-gray-800)] truncate">{p.client}</p>
          <p className="text-[11px] font-[350] text-[var(--c-gray-500)] truncate">{p.projectName}</p>
        </button>
        {deleteMode && (
          <div className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center transition-all ${isSelected ? 'bg-[var(--c-error)] text-white' : 'bg-black/40 text-white/60'}`}>
            {isSelected && (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M3 6l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
        )}
        {!deleteMode && !editMode && (
          <button
            onClick={() => handleRemove(p.id)}
            className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 text-white/80 hover:bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            title="Remove from collection"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M2.5 2.5l5 5M7.5 2.5l-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        )}
        {/* Move-to-group dropdown in edit mode */}
        {editMode && !deleteMode && collection.groups.length > 0 && (
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <select
              value={collection.itemGroups[p.id] || ''}
              onChange={(e) => handleMoveToGroup([p.id], e.target.value || null)}
              className="text-[9px] bg-white/90 border border-[var(--c-gray-200)] rounded px-1 py-0.5 cursor-pointer"
              onClick={(e) => e.stopPropagation()}
            >
              <option value="">Ungrouped</option>
              {collection.groups.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>
    )
  }

  const renderProjectGrid = (projects: Project[]) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
      {projects.map(renderProjectCard)}
    </div>
  )

  return (
    <div className="h-full overflow-y-auto bg-[var(--c-white)]">
      <div className="max-w-[1040px] px-4 sm:px-6 md:px-[48px] py-10">
        <div className="mb-4">
          <Breadcrumb items={[
            { label: 'Collections', href: '/collections' },
            { label: collection.name },
          ]} />
        </div>

        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-[1.4rem] font-[300] tracking-[-0.02em] text-[var(--c-gray-900)]">
              {collection.name}
            </h1>
            {collection.description && (
              <p className="text-[13px] text-[var(--c-gray-400)] mt-1">{collection.description}</p>
            )}
            <p className="text-[12px] text-[var(--c-gray-400)] mt-2">
              {collection.projects.length} project{collection.projects.length !== 1 ? 's' : ''}
              {collection.groups.length > 0 && ` · ${collection.groups.length} group${collection.groups.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {deleteMode ? (
              <>
                <button
                  onClick={handleBatchRemove}
                  disabled={selectedForDelete.size === 0 || batchRemoving}
                  className="text-[11px] font-[450] px-3 py-1.5 rounded-[var(--radius-sm)] bg-[var(--c-error)] text-white hover:bg-[var(--c-error)]/80 transition-colors disabled:opacity-30"
                >
                  {batchRemoving ? 'Removing...' : `Remove${selectedForDelete.size > 0 ? ` (${selectedForDelete.size})` : ''}`}
                </button>
                <button
                  onClick={() => { setDeleteMode(false); setSelectedForDelete(new Set()) }}
                  className="text-[11px] font-[400] text-[var(--c-gray-500)] hover:text-[var(--c-gray-900)] transition-colors px-3 py-1.5"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setEditMode(!editMode)}
                  className={`text-[11px] font-[450] px-3 py-1.5 rounded-[var(--radius-sm)] transition-colors ${
                    editMode
                      ? 'bg-[var(--c-gray-900)] text-white'
                      : 'border border-[var(--c-gray-200)] text-[var(--c-gray-600)] hover:bg-[var(--c-gray-50)]'
                  }`}
                >
                  {editMode ? 'Done' : 'Edit'}
                </button>
                <button
                  onClick={() => { setPickerGroupId(null); setPickerOpen(true) }}
                  className="text-[11px] font-[450] text-[var(--c-gray-600)] hover:text-[var(--c-gray-900)] transition-colors px-3 py-1.5 rounded-[var(--radius-sm)] border border-[var(--c-gray-200)] hover:border-[var(--c-gray-400)]"
                >
                  + Add Projects
                </button>
                {collection.projects.length > 0 && (
                  <button
                    onClick={() => setDeleteMode(true)}
                    className="text-[11px] font-[400] text-[var(--c-gray-400)] hover:text-[var(--c-gray-700)] transition-colors px-3 py-1.5"
                  >
                    Remove Projects
                  </button>
                )}
                <SharePopover
                  shareToken={collection.shareToken}
                  baseUrl="/collection"
                  onCreateLink={handleGenerateShareLink}
                  onDisableLink={handleRevokeShareLink}
                />
                <button
                  onClick={handleDelete}
                  className="text-[11px] font-[400] text-[var(--c-gray-400)] hover:text-[var(--c-error)] transition-colors px-3 py-1.5"
                >
                  Delete Collection
                </button>
              </>
            )}
          </div>
        </div>

        {/* Edit mode: add group button */}
        {editMode && (
          <div className="mb-6">
            <button
              onClick={handleAddGroup}
              className="text-[11px] font-[450] text-[var(--c-gray-500)] hover:text-[var(--c-gray-900)] transition-colors px-3 py-1.5 rounded-[var(--radius-sm)] border border-dashed border-[var(--c-gray-300)] hover:border-[var(--c-gray-500)]"
            >
              + Add Group
            </button>
          </div>
        )}

        {collection.projects.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-[13px] text-[var(--c-gray-400)] mb-3">No projects in this collection yet.</p>
            <button
              onClick={() => { setPickerGroupId(null); setPickerOpen(true) }}
              className="text-[12px] font-[450] text-[var(--c-gray-600)] hover:text-[var(--c-gray-900)] transition-colors px-4 py-2 rounded-[var(--radius-sm)] border border-[var(--c-gray-200)] hover:border-[var(--c-gray-400)]"
            >
              + Add Projects
            </button>
          </div>
        ) : (
          <>
            {/* Render groups */}
            {groupedProjects.groups.map((group) => (
              <div key={group.id} className="mb-10">
                <div className="flex items-center justify-between mb-4">
                  {editMode ? (
                    <div className="flex items-center gap-2">
                      <InlineEditCell
                        value={group.name}
                        onSave={(v) => handleRenameGroup(group.id, v)}
                        className="text-[15px] font-[450] !text-[var(--c-gray-800)]"
                      />
                      <span className="text-[10px] text-[var(--c-gray-400)]">{group.projects.length}</span>
                      <button
                        onClick={() => { setPickerGroupId(group.id); setPickerOpen(true) }}
                        className="text-[10px] text-[var(--c-gray-400)] hover:text-[var(--c-gray-700)] transition-colors ml-2"
                      >
                        + add
                      </button>
                      <button
                        onClick={() => handleDeleteGroup(group.id)}
                        className="text-[10px] text-[var(--c-gray-400)] hover:text-[var(--c-error)] transition-colors"
                      >
                        delete group
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <h2 className="text-[15px] font-[450] text-[var(--c-gray-800)]">{group.name}</h2>
                      <span className="text-[10px] text-[var(--c-gray-400)]">{group.projects.length}</span>
                    </div>
                  )}
                </div>
                {group.projects.length > 0 ? (
                  renderProjectGrid(group.projects)
                ) : (
                  <p className="text-[12px] text-[var(--c-gray-300)] italic py-4">No projects in this group yet.</p>
                )}
              </div>
            ))}

            {/* Ungrouped projects */}
            {groupedProjects.ungrouped.length > 0 && (
              <div className={groupedProjects.groups.length > 0 ? 'mt-10' : ''}>
                {groupedProjects.groups.length > 0 && (
                  <div className="flex items-center gap-2 mb-4">
                    <h2 className="text-[15px] font-[450] text-[var(--c-gray-500)]">Ungrouped</h2>
                    <span className="text-[10px] text-[var(--c-gray-400)]">{groupedProjects.ungrouped.length}</span>
                  </div>
                )}
                {renderProjectGrid(groupedProjects.ungrouped)}
              </div>
            )}
          </>
        )}
      </div>

      <ProjectSearchPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        collectionId={id}
        existingProjectIds={existingIds}
        onAdded={handleProjectsAdded}
        groupId={pickerGroupId}
      />
    </div>
  )
}
