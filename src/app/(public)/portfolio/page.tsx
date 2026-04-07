'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { Project } from '@/lib/types'
import { toSlug } from '@/lib/slug'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

function thumbUrl(folderName: string, image?: string) {
  if (!image) return null
  return `${SUPABASE_URL}/storage/v1/object/public/project-media/${folderName}/${image}`
}

export default function PortfolioPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/public/portfolio')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setProjects(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="max-w-[1200px] px-4 sm:px-6 md:px-[48px] py-12 mx-auto">
        <div className="h-[36px] w-48 bg-[var(--c-gray-100)] rounded animate-pulse mb-10" />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-[4/3] bg-[var(--c-gray-100)] rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[1200px] px-4 sm:px-6 md:px-[48px] py-12 mx-auto">
      <div className="mb-10">
        <h1 className="text-[1.6rem] sm:text-[2rem] font-[250] tracking-[-0.02em] text-[var(--c-gray-900)]">
          Portfolio
        </h1>
        <p className="text-[13px] text-[var(--c-gray-400)] mt-2">
          {projects.length} project{projects.length !== 1 ? 's' : ''}
        </p>
      </div>

      {projects.length === 0 ? (
        <p className="text-[13px] text-[var(--c-gray-400)]">No public projects yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
          {projects.map((p) => {
            const img = thumbUrl(p.folderName, p.thumbImage || p.heroImage)
            return (
              <Link
                key={p.id}
                href={`/portfolio/${toSlug(p.fullName)}`}
                className="group block"
              >
                <div className="aspect-[4/3] rounded-[var(--radius-sm)] overflow-hidden bg-[var(--c-gray-100)] mb-3">
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
                <p className="text-[13px] font-[500] text-[var(--c-gray-800)]">{p.client}</p>
                <p className="text-[12px] font-[350] text-[var(--c-gray-500)] mt-0.5">{p.projectName}</p>
                {p.tagline && (
                  <p className="text-[11px] text-[var(--c-gray-400)] mt-1 line-clamp-2">{p.tagline}</p>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
