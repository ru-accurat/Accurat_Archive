'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import type { Project } from '@/lib/types'

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

interface SharedCollection {
  name: string
  description: string
  projects: Project[]
  groups: CollectionGroup[]
  itemGroups: Record<string, string | null>
}

export default function SharedCollectionPage() {
  const { token } = useParams<{ token: string }>()
  const [collection, setCollection] = useState<SharedCollection | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    fetch(`/api/public/collection/${token}`)
      .then((r) => {
        if (!r.ok) { setNotFound(true); setLoading(false); return null }
        return r.json()
      })
      .then((data) => {
        if (data) setCollection(data)
        setLoading(false)
      })
      .catch(() => { setNotFound(true); setLoading(false) })
  }, [token])

  // Group projects
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

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh] text-[var(--c-gray-400)] text-[13px]">Loading...</div>
  }

  if (notFound || !collection) {
    return <div className="flex items-center justify-center min-h-[60vh] text-[var(--c-gray-400)] text-[13px]">This collection link is no longer available.</div>
  }

  const hasGroups = groupedProjects.groups.length > 0

  const renderCard = (p: Project) => {
    const img = thumbUrl(p.folderName, p.thumbImage || p.heroImage)
    // All projects in a shared collection are viewable via the shared project route
    const href = `/collection/${token}/project/${p.id}`
    return (
      <Link key={p.id} href={href} className="group block">
        <div className="aspect-[4/3] rounded-[var(--radius-sm)] overflow-hidden bg-[var(--c-gray-100)] mb-3">
          {img ? (
            <img src={img} alt={p.projectName} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[var(--c-gray-300)] text-[10px]">No image</div>
          )}
        </div>
        <p className="text-[13px] font-[500] text-[var(--c-gray-800)]">{p.client}</p>
        <p className="text-[12px] font-[350] text-[var(--c-gray-500)] mt-0.5">{p.projectName}</p>
      </Link>
    )
  }

  const renderGrid = (projects: Project[]) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
      {projects.map(renderCard)}
    </div>
  )

  return (
    <div className="max-w-[1200px] px-4 sm:px-6 md:px-[48px] py-12 mx-auto">
      <div className="mb-10">
        <h1 className="text-[1.6rem] sm:text-[2rem] font-[250] tracking-[-0.02em] text-[var(--c-gray-900)]">
          {collection.name}
        </h1>
        {collection.description && (
          <p className="text-[13px] text-[var(--c-gray-400)] mt-2">{collection.description}</p>
        )}
        <p className="text-[12px] text-[var(--c-gray-400)] mt-2">
          {collection.projects.length} project{collection.projects.length !== 1 ? 's' : ''}
        </p>
      </div>

      {collection.projects.length === 0 ? (
        <p className="text-[13px] text-[var(--c-gray-400)]">This collection is empty.</p>
      ) : (
        <>
          {/* Render groups */}
          {groupedProjects.groups.map((group) => (
            <div key={group.id} className="mb-12">
              <div className="flex items-center gap-2 mb-5">
                <h2 className="text-[1.1rem] font-[350] text-[var(--c-gray-800)]">{group.name}</h2>
                <span className="text-[11px] text-[var(--c-gray-400)]">{group.projects.length}</span>
              </div>
              {group.projects.length > 0 ? renderGrid(group.projects) : (
                <p className="text-[12px] text-[var(--c-gray-300)] italic">No projects in this group.</p>
              )}
            </div>
          ))}

          {/* Ungrouped */}
          {groupedProjects.ungrouped.length > 0 && (
            <div className={hasGroups ? 'mt-12' : ''}>
              {hasGroups && (
                <div className="flex items-center gap-2 mb-5">
                  <h2 className="text-[1.1rem] font-[350] text-[var(--c-gray-500)]">Other</h2>
                  <span className="text-[11px] text-[var(--c-gray-400)]">{groupedProjects.ungrouped.length}</span>
                </div>
              )}
              {renderGrid(groupedProjects.ungrouped)}
            </div>
          )}
        </>
      )}
    </div>
  )
}
