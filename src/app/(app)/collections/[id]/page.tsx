'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
// Minimal project shape used on this page (satisfied by both Project and ProjectSummary)
type CollectionProject = {
  id: string
  client: string
  projectName: string
  folderName: string
  heroImage?: string
  thumbImage?: string
}
import { useProjects } from '@/hooks/use-projects'
import { ProjectSearchPicker } from '@/components/shared/ProjectSearchPicker'
import { Breadcrumb } from '@/components/shared/Breadcrumb'
import { SharePopover } from '@/components/shared/SharePopover'
import { InlineEditCell } from '@/components/shared/InlineEditCell'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragStartEvent,
  type DragEndEvent,
  useDroppable,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  rectSortingStrategy,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

function thumbUrl(folderName: string, image?: string) {
  if (!image) return null
  return `${SUPABASE_URL}/storage/v1/object/public/project-media/${folderName}/${image}`
}

interface CollectionGroup {
  id: string
  name: string
  subtitle: string
  sortOrder: number
}

interface CollectionDetail {
  id: string
  name: string
  subtitle: string
  description: string
  shareToken: string | null
  projects: CollectionProject[]
  groups: CollectionGroup[]
  itemGroups: Record<string, string | null>
  itemCaptions: Record<string, string>
}

// ── Sortable project card ──────────────────────────────────────
function SortableProjectCard({
  project,
  caption,
  isDeleteMode,
  isEditMode,
  isSelected,
  groups,
  currentGroupId,
  onToggleSelect,
  onNavigate,
  onRemove,
  onMoveToGroup,
  onCaptionSave,
}: {
  project: CollectionProject
  caption: string
  isDeleteMode: boolean
  isEditMode: boolean
  isSelected: boolean
  groups: CollectionGroup[]
  currentGroupId: string | null
  onToggleSelect: (id: string) => void
  onNavigate: (id: string) => void
  onRemove: (id: string) => void
  onMoveToGroup: (projectIds: string[], groupId: string | null) => void
  onCaptionSave: (projectId: string, caption: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: project.id,
    disabled: !isEditMode || isDeleteMode,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  }

  const img = thumbUrl(project.folderName, project.thumbImage || project.heroImage)

  return (
    <div ref={setNodeRef} style={style} {...attributes} className="group relative">
      {/* Drag handle in edit mode */}
      {isEditMode && !isDeleteMode && (
        <div
          {...listeners}
          className="absolute top-2 left-2 z-10 w-5 h-5 rounded bg-black/50 text-white/80 flex items-center justify-center cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
          title="Drag to reorder"
        >
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
            <circle cx="2.5" cy="1.5" r="0.7" fill="currentColor" />
            <circle cx="5.5" cy="1.5" r="0.7" fill="currentColor" />
            <circle cx="2.5" cy="4" r="0.7" fill="currentColor" />
            <circle cx="5.5" cy="4" r="0.7" fill="currentColor" />
            <circle cx="2.5" cy="6.5" r="0.7" fill="currentColor" />
            <circle cx="5.5" cy="6.5" r="0.7" fill="currentColor" />
          </svg>
        </div>
      )}
      {/* Move-to-group dropdown in edit mode — positioned below thumbnail */}
      {isEditMode && !isDeleteMode && groups.length > 0 && (
        <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity max-w-[calc(100%-24px)]">
          <select
            value={currentGroupId || ''}
            onChange={(e) => onMoveToGroup([project.id], e.target.value || null)}
            className="text-[9px] bg-white/90 backdrop-blur-sm border border-[var(--c-gray-200)] rounded px-1.5 py-0.5 cursor-pointer shadow-sm max-w-full truncate"
            onClick={(e) => e.stopPropagation()}
          >
            <option value="">Ungrouped</option>
            {groups.map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>
      )}
      <button
        onClick={() => isDeleteMode ? onToggleSelect(project.id) : onNavigate(project.id)}
        className={`text-left w-full transition-opacity duration-150 ${isDeleteMode && !isSelected ? 'opacity-60' : ''}`}
      >
        <div className={`aspect-[4/3] rounded-[var(--radius-sm)] overflow-hidden bg-[var(--c-gray-100)] mb-2 ${isDeleteMode ? 'cursor-pointer' : ''} ${isSelected ? 'ring-2 ring-[var(--c-error)]' : ''}`}>
          {img ? (
            <img src={img} alt={project.projectName} className={`w-full h-full object-cover transition-transform duration-300 ${!isDeleteMode ? 'group-hover:scale-105' : ''}`} />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[var(--c-gray-300)] text-[10px]">No image</div>
          )}
        </div>
        <p className="text-[12px] font-[500] text-[var(--c-gray-800)] truncate">{project.client}</p>
        <p className="text-[11px] font-[350] text-[var(--c-gray-500)] truncate">{project.projectName}</p>
      </button>
      {/* Caption: editable in edit mode, visible in view mode */}
      {isEditMode && !isDeleteMode ? (
        <div className="mt-1">
          <InlineEditCell
            value={caption}
            onSave={(v) => onCaptionSave(project.id, v)}
            className="text-[10px] !text-[var(--c-gray-400)] italic"
            placeholder="Add caption..."
          />
        </div>
      ) : caption ? (
        <p className="text-[10px] text-[var(--c-gray-400)] italic mt-1">{caption}</p>
      ) : null}
      {isDeleteMode && (
        <div className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center transition-all ${isSelected ? 'bg-[var(--c-error)] text-white' : 'bg-black/40 text-white/60'}`}>
          {isSelected && (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M3 6l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
      )}
      {!isDeleteMode && !isEditMode && (
        <button
          onClick={() => onRemove(project.id)}
          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 text-white/80 hover:bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          title="Remove from collection"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2.5 2.5l5 5M7.5 2.5l-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </div>
  )
}

// ── Sortable group header (for reordering groups) ──────────────
function SortableGroupHeader({
  group,
  projectCount,
  editMode,
  onRename,
  onSubtitleSave,
  onAddToGroup,
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: {
  group: CollectionGroup
  projectCount: number
  editMode: boolean
  onRename: (name: string) => void
  onSubtitleSave: (subtitle: string) => void
  onAddToGroup: () => void
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  isFirst: boolean
  isLast: boolean
}) {
  if (editMode) {
    return (
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <div className="flex flex-col gap-0.5 mr-1">
              <button
                onClick={onMoveUp}
                disabled={isFirst}
                className="text-[var(--c-gray-400)] hover:text-[var(--c-gray-700)] disabled:opacity-20 transition-colors"
                title="Move group up"
              >
                <svg width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 5l4-4 4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
              <button
                onClick={onMoveDown}
                disabled={isLast}
                className="text-[var(--c-gray-400)] hover:text-[var(--c-gray-700)] disabled:opacity-20 transition-colors"
                title="Move group down"
              >
                <svg width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            </div>
            <InlineEditCell
              value={group.name}
              onSave={onRename}
              className="text-[15px] font-[450] !text-[var(--c-gray-800)]"
            />
            <span className="text-[10px] text-[var(--c-gray-400)]">{projectCount}</span>
            <button onClick={onAddToGroup} className="text-[10px] text-[var(--c-gray-400)] hover:text-[var(--c-gray-700)] transition-colors ml-2">+ add</button>
            <button onClick={onDelete} className="text-[10px] text-[var(--c-gray-400)] hover:text-[var(--c-error)] transition-colors">delete group</button>
          </div>
          <div className="ml-6 mt-1">
            <InlineEditCell
              value={group.subtitle}
              onSave={onSubtitleSave}
              className="text-[12px] !text-[var(--c-gray-400)]"
              placeholder="Add subtitle..."
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2">
        <h2 className="text-[15px] font-[450] text-[var(--c-gray-800)]">{group.name}</h2>
        <span className="text-[10px] text-[var(--c-gray-400)]">{projectCount}</span>
      </div>
      {group.subtitle && (
        <p className="text-[12px] text-[var(--c-gray-400)] mt-0.5">{group.subtitle}</p>
      )}
    </div>
  )
}

// ── Droppable group container ──────────────────────────────────
function DroppableGroup({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div
      ref={setNodeRef}
      className={`min-h-[80px] rounded-[var(--radius-sm)] transition-colors ${isOver ? 'bg-[var(--c-gray-50)] ring-2 ring-[var(--c-gray-300)] ring-dashed' : ''}`}
    >
      {children}
    </div>
  )
}

// ── Drag overlay card (matches grid card sizing) ───────────────
function DragOverlayCard({ project }: { project: CollectionProject }) {
  const img = thumbUrl(project.folderName, project.thumbImage || project.heroImage)
  return (
    <div className="w-[200px] opacity-90 rotate-1 shadow-xl rounded-[var(--radius-sm)] bg-[var(--c-white)] overflow-hidden">
      <div className="aspect-[4/3] overflow-hidden bg-[var(--c-gray-100)]">
        {img ? <img src={img} alt="" className="w-full h-full object-cover" /> : null}
      </div>
      <div className="px-2 py-1.5">
        <p className="text-[11px] font-[500] text-[var(--c-gray-800)] truncate">{project.client}</p>
        <p className="text-[10px] text-[var(--c-gray-500)] truncate">{project.projectName}</p>
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────
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
  const [activeId, setActiveId] = useState<string | null>(null)
  const [analytics, setAnalytics] = useState<{ totalViews: number; uniqueVisitors: number; lastViewedAt: string | null } | null>(null)

  useEffect(() => {
    if (!id) return
    fetch(`/api/collections/${id}/analytics`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data) setAnalytics(data) })
      .catch(() => {})
  }, [id])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

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

    const byGroup: Record<string, CollectionProject[]> = {}
    const ungrouped: CollectionProject[] = []

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

  const activeProject = useMemo(
    () => collection?.projects.find(p => p.id === activeId) || null,
    [collection, activeId]
  )

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

  const handleProjectsAdded = useCallback((added: CollectionProject[]) => {
    setCollection((prev) => {
      if (!prev) return null
      const newItemGroups = { ...prev.itemGroups }
      for (const p of added) {
        newItemGroups[p.id] = pickerGroupId
      }
      return { ...prev, projects: [...prev.projects, ...added], itemGroups: newItemGroups }
    })
  }, [pickerGroupId])

  const handleSubtitleSave = useCallback(async (subtitle: string) => {
    await fetch(`/api/collections/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subtitle }),
    })
    setCollection((prev) => prev ? { ...prev, subtitle } : null)
  }, [id])

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
      groups: [...(prev.groups || []), { id: group.id, name: group.name, subtitle: '', sortOrder: group.sort_order }],
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

  const handleSubtitleGroup = useCallback(async (groupId: string, subtitle: string) => {
    await fetch(`/api/collections/${id}/groups/${groupId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subtitle }),
    })
    setCollection((prev) => prev ? {
      ...prev,
      groups: prev.groups.map(g => g.id === groupId ? { ...g, subtitle } : g),
    } : null)
  }, [id])

  const handleDeleteGroup = useCallback(async (groupId: string) => {
    await fetch(`/api/collections/${id}/groups/${groupId}`, { method: 'DELETE' })
    setCollection((prev) => {
      if (!prev) return null
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

  const handleMoveGroupUp = useCallback(async (groupId: string) => {
    if (!collection) return
    const groups = [...collection.groups]
    const idx = groups.findIndex(g => g.id === groupId)
    if (idx <= 0) return
    ;[groups[idx - 1], groups[idx]] = [groups[idx], groups[idx - 1]]
    setCollection(prev => prev ? { ...prev, groups } : null)
    await fetch(`/api/collections/${id}/groups`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order: groups.map(g => g.id) }),
    })
  }, [id, collection])

  const handleMoveGroupDown = useCallback(async (groupId: string) => {
    if (!collection) return
    const groups = [...collection.groups]
    const idx = groups.findIndex(g => g.id === groupId)
    if (idx < 0 || idx >= groups.length - 1) return
    ;[groups[idx], groups[idx + 1]] = [groups[idx + 1], groups[idx]]
    setCollection(prev => prev ? { ...prev, groups } : null)
    await fetch(`/api/collections/${id}/groups`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order: groups.map(g => g.id) }),
    })
  }, [id, collection])

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

  const handleCaptionSave = useCallback(async (projectId: string, caption: string) => {
    await fetch(`/api/collections/${id}/items`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, caption }),
    })
    setCollection((prev) => {
      if (!prev) return null
      const newCaptions = { ...prev.itemCaptions }
      if (caption) newCaptions[projectId] = caption
      else delete newCaptions[projectId]
      return { ...prev, itemCaptions: newCaptions }
    })
  }, [id])

  // DnD handlers
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }, [])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveId(null)
    const { active, over } = event
    if (!over || !collection) return

    const draggedProjectId = active.id as string
    const overId = over.id as string

    let targetGroupId: string | null = null

    if (overId === 'ungrouped') {
      targetGroupId = null
    } else if (collection.groups.some(g => g.id === overId)) {
      targetGroupId = overId
    } else {
      targetGroupId = collection.itemGroups[overId] ?? null
    }

    const currentGroupId = collection.itemGroups[draggedProjectId] ?? null

    if (currentGroupId !== targetGroupId) {
      handleMoveToGroup([draggedProjectId], targetGroupId)
    }
  }, [collection, handleMoveToGroup])

  if (loading) {
    return <div className="flex items-center justify-center h-full bg-[var(--c-white)] text-[var(--c-gray-400)] text-[13px]">Loading...</div>
  }

  if (!collection) {
    return <div className="flex items-center justify-center h-full bg-[var(--c-white)] text-[var(--c-gray-400)] text-[13px]">Collection not found</div>
  }

  const renderProjectGrid = (projects: CollectionProject[], containerId: string) => {
    const projectIds = projects.map(p => p.id)
    return (
      <DroppableGroup id={containerId}>
        <SortableContext items={projectIds} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
            {projects.map((p) => (
              <SortableProjectCard
                key={p.id}
                project={p}
                caption={collection.itemCaptions?.[p.id] || ''}
                isDeleteMode={deleteMode}
                isEditMode={editMode}
                isSelected={selectedForDelete.has(p.id)}
                groups={collection.groups}
                currentGroupId={collection.itemGroups[p.id] ?? null}
                onToggleSelect={toggleDeleteSelection}
                onNavigate={(pid) => router.push(`/project/${pid}`)}
                onRemove={handleRemove}
                onMoveToGroup={handleMoveToGroup}
                onCaptionSave={handleCaptionSave}
              />
            ))}
          </div>
        </SortableContext>
      </DroppableGroup>
    )
  }

  const content = (
    <>
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
          {groupedProjects.groups.map((group, idx) => (
            <div key={group.id} className="mb-10">
              <SortableGroupHeader
                group={group}
                projectCount={group.projects.length}
                editMode={editMode}
                onRename={(name) => handleRenameGroup(group.id, name)}
                onSubtitleSave={(sub) => handleSubtitleGroup(group.id, sub)}
                onAddToGroup={() => { setPickerGroupId(group.id); setPickerOpen(true) }}
                onDelete={() => handleDeleteGroup(group.id)}
                onMoveUp={() => handleMoveGroupUp(group.id)}
                onMoveDown={() => handleMoveGroupDown(group.id)}
                isFirst={idx === 0}
                isLast={idx === groupedProjects.groups.length - 1}
              />
              {group.projects.length > 0 ? (
                renderProjectGrid(group.projects, group.id)
              ) : (
                <DroppableGroup id={group.id}>
                  <p className="text-[12px] text-[var(--c-gray-300)] italic py-4">
                    {editMode ? 'Drop projects here' : 'No projects in this group yet.'}
                  </p>
                </DroppableGroup>
              )}
            </div>
          ))}

          {groupedProjects.ungrouped.length > 0 && (
            <div className={groupedProjects.groups.length > 0 ? 'mt-10' : ''}>
              {groupedProjects.groups.length > 0 && (
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="text-[15px] font-[450] text-[var(--c-gray-500)]">Ungrouped</h2>
                  <span className="text-[10px] text-[var(--c-gray-400)]">{groupedProjects.ungrouped.length}</span>
                </div>
              )}
              {renderProjectGrid(groupedProjects.ungrouped, 'ungrouped')}
            </div>
          )}

          {groupedProjects.ungrouped.length === 0 && groupedProjects.groups.length > 0 && editMode && (
            <div className="mt-10">
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-[15px] font-[450] text-[var(--c-gray-500)]">Ungrouped</h2>
              </div>
              <DroppableGroup id="ungrouped">
                <p className="text-[12px] text-[var(--c-gray-300)] italic py-4">Drop projects here to ungroup</p>
              </DroppableGroup>
            </div>
          )}
        </>
      )}
    </>
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
            {editMode ? (
              <div className="mt-1">
                <InlineEditCell
                  value={collection.subtitle || ''}
                  onSave={handleSubtitleSave}
                  className="text-[13px] !text-[var(--c-gray-500)]"
                  placeholder="Add subtitle..."
                />
              </div>
            ) : collection.subtitle ? (
              <p className="text-[13px] text-[var(--c-gray-500)] mt-1">{collection.subtitle}</p>
            ) : null}
            {collection.description && (
              <p className="text-[12px] text-[var(--c-gray-400)] mt-1">{collection.description}</p>
            )}
            <p className="text-[12px] text-[var(--c-gray-400)] mt-2">
              {collection.projects.length} project{collection.projects.length !== 1 ? 's' : ''}
              {collection.groups.length > 0 && ` · ${collection.groups.length} group${collection.groups.length !== 1 ? 's' : ''}`}
              {analytics && analytics.totalViews > 0 && (
                <>
                  {' · '}
                  <span title={`${analytics.uniqueVisitors} unique visitor${analytics.uniqueVisitors !== 1 ? 's' : ''}${analytics.lastViewedAt ? ' · last viewed ' + new Date(analytics.lastViewedAt).toLocaleDateString() : ''}`}>
                    Viewed {analytics.totalViews} time{analytics.totalViews !== 1 ? 's' : ''}
                  </span>
                </>
              )}
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

        {editMode ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            {content}
            <DragOverlay>
              {activeProject ? <DragOverlayCard project={activeProject} /> : null}
            </DragOverlay>
          </DndContext>
        ) : (
          content
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
