'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import type { Project } from '@/lib/types'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

function thumbUrl(folderName: string, image?: string) {
  if (!image) return null
  return `${SUPABASE_URL}/storage/v1/object/public/project-media/${folderName}/${image}`
}

interface CollectionDetail {
  id: string
  name: string
  description: string
  projects: Project[]
}

export default function CollectionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [collection, setCollection] = useState<CollectionDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/collections/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setCollection(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [id])

  const handleRemove = useCallback(async (projectId: string) => {
    await fetch(`/api/collections/${id}/items`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId }),
    })
    setCollection((prev) =>
      prev ? { ...prev, projects: prev.projects.filter((p) => p.id !== projectId) } : null
    )
  }, [id])

  const handleDelete = useCallback(async () => {
    if (!confirm('Delete this collection?')) return
    await fetch(`/api/collections/${id}`, { method: 'DELETE' })
    router.push('/collections')
  }, [id, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-[var(--c-white)] text-[var(--c-gray-400)] text-[13px]">
        Loading...
      </div>
    )
  }

  if (!collection) {
    return (
      <div className="flex items-center justify-center h-full bg-[var(--c-white)] text-[var(--c-gray-400)] text-[13px]">
        Collection not found
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto bg-[var(--c-white)]">
      <div className="max-w-[1040px] px-4 sm:px-6 md:px-[48px] py-10">
        <div className="flex items-center gap-4 mb-2">
          <button
            onClick={() => router.push('/collections')}
            className="text-[12px] text-[var(--c-gray-400)] hover:text-[var(--c-gray-700)] transition-colors"
          >
            &larr; Collections
          </button>
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
            </p>
          </div>
          <button
            onClick={handleDelete}
            className="text-[11px] font-[400] text-[var(--c-gray-400)] hover:text-[var(--c-error)] transition-colors px-3 py-1.5"
          >
            Delete
          </button>
        </div>

        {collection.projects.length === 0 ? (
          <p className="text-[13px] text-[var(--c-gray-400)]">
            No projects in this collection. Use the bulk actions on the homepage to add projects.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
            {collection.projects.map((p) => {
              const img = thumbUrl(p.folderName, p.thumbImage || p.heroImage)
              return (
                <div key={p.id} className="group relative">
                  <button
                    onClick={() => router.push(`/project/${p.id}`)}
                    className="text-left w-full"
                  >
                    <div className="aspect-[4/3] rounded-[var(--radius-sm)] overflow-hidden bg-[var(--c-gray-100)] mb-2">
                      {img ? (
                        <img
                          src={img}
                          alt={p.projectName}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[var(--c-gray-300)] text-[10px]">
                          No image
                        </div>
                      )}
                    </div>
                    <p className="text-[12px] font-[500] text-[var(--c-gray-800)] truncate">{p.client}</p>
                    <p className="text-[11px] font-[350] text-[var(--c-gray-500)] truncate">{p.projectName}</p>
                  </button>
                  <button
                    onClick={() => handleRemove(p.id)}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 text-white/80 hover:bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remove from collection"
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2.5 2.5l5 5M7.5 2.5l-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
