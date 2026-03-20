'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Project } from '@/lib/types'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

function thumbUrl(folderName: string, thumbImage?: string) {
  if (!thumbImage) return null
  return `${SUPABASE_URL}/storage/v1/object/public/project-media/${folderName}/${thumbImage}`
}

export function RelatedProjects({ projectId }: { projectId: string }) {
  const router = useRouter()
  const [related, setRelated] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/projects/${projectId}/related`)
      .then((r) => r.json())
      .then((data) => {
        setRelated(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [projectId])

  if (loading || related.length === 0) return null

  return (
    <div>
      <h3 className="text-[10px] font-[500] uppercase tracking-[0.1em] text-[var(--c-gray-400)] mb-4">
        Related Projects
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
        {related.map((p) => {
          const img = thumbUrl(p.folderName, p.thumbImage || p.heroImage)
          return (
            <button
              key={p.id}
              onClick={() => router.push(`/project/${p.id}`)}
              className="text-left group"
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
              <p className="text-[11px] font-[450] text-[var(--c-gray-700)] group-hover:text-[var(--c-gray-900)] transition-colors truncate">
                {p.client}
              </p>
              <p className="text-[11px] font-[350] text-[var(--c-gray-500)] truncate">
                {p.projectName}
              </p>
            </button>
          )
        })}
      </div>
    </div>
  )
}
