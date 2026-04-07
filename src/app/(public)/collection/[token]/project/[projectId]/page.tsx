'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import type { Project } from '@/lib/types'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

interface MediaItem {
  filename: string
  url: string
}

export default function SharedProjectPage() {
  const { token, projectId } = useParams<{ token: string; projectId: string }>()
  const [project, setProject] = useState<Project | null>(null)
  const [media, setMedia] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    // Anonymous view tracking (project-level)
    fetch(`/api/public/collection/${token}/track-view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId }),
    }).catch(() => {})
    fetch(`/api/public/collection/${token}/project/${projectId}`)
      .then((r) => {
        if (!r.ok) { setNotFound(true); setLoading(false); return null }
        return r.json()
      })
      .then((data) => {
        if (data) {
          setProject(data.project)
          setMedia(data.media || [])
        }
        setLoading(false)
      })
      .catch(() => { setNotFound(true); setLoading(false) })
  }, [token, projectId])

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh] text-[var(--c-gray-400)] text-[13px]">Loading...</div>
  }

  if (notFound || !project) {
    return <div className="flex items-center justify-center min-h-[60vh] text-[var(--c-gray-400)] text-[13px]">Project not found.</div>
  }

  // Hero image
  const heroImage = project.heroImage
    ? `${SUPABASE_URL}/storage/v1/object/public/project-media/${project.folderName}/${project.heroImage}`
    : media[0]?.url || null

  // Gallery (exclude hero)
  const gallery = media.filter(m => m.filename !== project.heroImage)

  return (
    <div className="max-w-[1000px] px-4 sm:px-6 md:px-[48px] py-8 mx-auto">
      {/* Back link */}
      <Link
        href={`/collection/${token}`}
        className="text-[12px] font-[400] text-[var(--c-gray-400)] hover:text-[var(--c-gray-700)] transition-colors mb-6 inline-block"
      >
        &larr; Back to collection
      </Link>

      {/* Hero */}
      {heroImage && (
        <div className="mb-8 rounded-[var(--radius-sm)] overflow-hidden bg-[var(--c-gray-100)]">
          <img src={heroImage} alt={project.projectName} className="w-full" />
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <p className="text-[12px] font-[450] text-[var(--c-gray-500)] uppercase tracking-[0.06em] mb-1">{project.client}</p>
        <h1 className="text-[1.6rem] sm:text-[2rem] font-[250] tracking-[-0.02em] text-[var(--c-gray-900)]">
          {project.projectName}
        </h1>
        {project.tagline && (
          <p className="text-[15px] font-[350] text-[var(--c-gray-600)] mt-3 leading-relaxed">{project.tagline}</p>
        )}
        <div className="flex flex-wrap gap-3 mt-4 text-[11px] text-[var(--c-gray-400)]">
          {project.section && <span>{project.section}</span>}
          {project.start && <span>{project.start}{project.end ? `–${project.end}` : ''}</span>}
          {project.output && <span>{project.output}</span>}
        </div>
      </div>

      {/* Tags */}
      {(project.domains.length > 0 || project.services.length > 0) && (
        <div className="flex flex-wrap gap-1.5 mb-8">
          {project.domains.map(d => (
            <span key={d} className="text-[10px] px-2.5 py-1 rounded-full bg-[var(--c-gray-100)] text-[var(--c-gray-600)]">{d}</span>
          ))}
          {project.services.map(s => (
            <span key={s} className="text-[10px] px-2.5 py-1 rounded-full bg-[var(--c-gray-50)] text-[var(--c-gray-500)]">{s}</span>
          ))}
        </div>
      )}

      {/* Description */}
      {project.description && (
        <div className="mb-8">
          <h2 className="text-[11px] font-[500] uppercase tracking-[0.08em] text-[var(--c-gray-400)] mb-2">Description</h2>
          <p className="text-[14px] font-[350] text-[var(--c-gray-700)] leading-[1.7] whitespace-pre-line">{project.description}</p>
        </div>
      )}

      {/* Challenge & Solution */}
      {(project.challenge || project.solution) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {project.challenge && (
            <div>
              <h2 className="text-[11px] font-[500] uppercase tracking-[0.08em] text-[var(--c-gray-400)] mb-2">Challenge</h2>
              <p className="text-[14px] font-[350] text-[var(--c-gray-700)] leading-[1.7] whitespace-pre-line">{project.challenge}</p>
            </div>
          )}
          {project.solution && (
            <div>
              <h2 className="text-[11px] font-[500] uppercase tracking-[0.08em] text-[var(--c-gray-400)] mb-2">Solution</h2>
              <p className="text-[14px] font-[350] text-[var(--c-gray-700)] leading-[1.7] whitespace-pre-line">{project.solution}</p>
            </div>
          )}
        </div>
      )}

      {/* Deliverables */}
      {project.deliverables && (
        <div className="mb-8">
          <h2 className="text-[11px] font-[500] uppercase tracking-[0.08em] text-[var(--c-gray-400)] mb-2">Deliverables</h2>
          <p className="text-[14px] font-[350] text-[var(--c-gray-700)] leading-[1.7]">{project.deliverables}</p>
        </div>
      )}

      {/* Client Quote */}
      {project.clientQuotes && (
        <div className="mb-8 bg-[var(--c-gray-900)] text-white rounded-[var(--radius-sm)] px-8 py-6">
          <p className="text-[14px] font-[350] leading-[1.7] italic">{project.clientQuotes}</p>
        </div>
      )}

      {/* Gallery */}
      {gallery.length > 0 && (
        <div className="mb-8">
          <h2 className="text-[11px] font-[500] uppercase tracking-[0.08em] text-[var(--c-gray-400)] mb-4">Gallery</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {gallery.map((m) => (
              <div key={m.filename} className="rounded-[var(--radius-sm)] overflow-hidden bg-[var(--c-gray-100)]">
                <img src={m.url} alt="" className="w-full" loading="lazy" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* URLs */}
      {project.urls.length > 0 && (
        <div className="mb-8">
          <h2 className="text-[11px] font-[500] uppercase tracking-[0.08em] text-[var(--c-gray-400)] mb-2">Links</h2>
          <div className="flex flex-col gap-1">
            {project.urls.map((url, i) => (
              <a
                key={i}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[13px] text-[var(--c-gray-600)] hover:text-[var(--c-gray-900)] transition-colors underline"
              >
                {url}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Team */}
      {project.team.length > 0 && (
        <div className="mb-8">
          <h2 className="text-[11px] font-[500] uppercase tracking-[0.08em] text-[var(--c-gray-400)] mb-2">Team</h2>
          <div className="flex flex-wrap gap-1.5">
            {project.team.map(t => (
              <span key={t} className="text-[11px] px-2.5 py-1 rounded-full bg-[var(--c-gray-100)] text-[var(--c-gray-600)]">{t}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
