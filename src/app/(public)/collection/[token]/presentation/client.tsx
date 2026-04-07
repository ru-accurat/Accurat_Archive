'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { Project } from '@/lib/types'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

interface CollectionGroup {
  id: string
  name: string
  subtitle: string
  sortOrder: number
}

interface SharedCollection {
  name: string
  subtitle: string
  description: string
  projects: Project[]
  groups: CollectionGroup[]
  itemGroups: Record<string, string | null>
  itemCaptions: Record<string, string>
}

type Slide =
  | { kind: 'divider'; group: CollectionGroup }
  | { kind: 'project'; project: Project; caption: string }

function imgUrl(folderName: string, image?: string) {
  if (!image) return null
  return `${SUPABASE_URL}/storage/v1/object/public/project-media/${folderName}/${image}`
}

export function PresentationClient({ token }: { token: string }) {
  const router = useRouter()
  const [collection, setCollection] = useState<SharedCollection | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [index, setIndex] = useState(0)

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

  // Build slides
  const slides = useMemo<Slide[]>(() => {
    if (!collection) return []
    const itemGroups = collection.itemGroups || {}
    const captions = collection.itemCaptions || {}
    const groups = collection.groups || []

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

    const out: Slide[] = []
    for (const g of groups) {
      const list = byGroup[g.id] || []
      if (list.length === 0) continue
      out.push({ kind: 'divider', group: g })
      for (const p of list) out.push({ kind: 'project', project: p, caption: captions[p.id] || '' })
    }
    for (const p of ungrouped) out.push({ kind: 'project', project: p, caption: captions[p.id] || '' })
    return out
  }, [collection])

  const go = useCallback((delta: number) => {
    setIndex((i) => {
      const next = i + delta
      if (next < 0) return 0
      if (next >= slides.length) return slides.length - 1
      return next
    })
  }, [slides.length])

  // Track view on mount
  useEffect(() => {
    if (!collection) return
    fetch(`/api/public/collection/${token}/track-view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }).catch(() => {})
  }, [collection, token])

  // Keyboard nav
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault()
        go(1)
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault()
        go(-1)
      } else if (e.key === 'Escape') {
        router.push(`/collection/${token}`)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, router, token])

  if (loading) {
    return <div className="fixed inset-0 bg-black text-white/60 flex items-center justify-center text-[13px]">Loading…</div>
  }

  if (notFound || !collection) {
    return <div className="fixed inset-0 bg-black text-white/60 flex items-center justify-center text-[13px]">This collection link is no longer available.</div>
  }

  if (slides.length === 0) {
    return (
      <div className="fixed inset-0 bg-black text-white flex flex-col items-center justify-center gap-4">
        <p className="text-[14px] text-white/60">This collection has no projects to present.</p>
        <button
          onClick={() => router.push(`/collection/${token}`)}
          className="text-[12px] text-white/80 underline underline-offset-4 hover:text-white"
        >
          Back to collection
        </button>
      </div>
    )
  }

  const slide = slides[index]

  return (
    <div className="fixed inset-0 bg-black text-white overflow-hidden select-none">
      {/* Slide content */}
      <div className="absolute inset-0 flex items-center justify-center px-16 py-20">
        {slide.kind === 'divider' ? (
          <div className="text-center max-w-[900px]">
            <div className="text-[11px] tracking-[0.18em] uppercase text-white/40 mb-6">Section</div>
            <h2 className="text-[3.2rem] sm:text-[4.5rem] font-[250] tracking-[-0.02em] leading-[1.05]">
              {slide.group.name}
            </h2>
            {slide.group.subtitle && (
              <p className="text-[18px] sm:text-[22px] text-white/60 font-[300] mt-6">{slide.group.subtitle}</p>
            )}
          </div>
        ) : (
          <ProjectSlide project={slide.project} caption={slide.caption} />
        )}
      </div>

      {/* Left arrow */}
      <button
        onClick={() => go(-1)}
        disabled={index === 0}
        aria-label="Previous slide"
        className="absolute left-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full border border-white/20 text-white/70 hover:text-white hover:border-white/60 transition-colors flex items-center justify-center disabled:opacity-20 disabled:cursor-not-allowed"
      >
        <span className="text-[20px] leading-none">←</span>
      </button>

      {/* Right arrow */}
      <button
        onClick={() => go(1)}
        disabled={index === slides.length - 1}
        aria-label="Next slide"
        className="absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full border border-white/20 text-white/70 hover:text-white hover:border-white/60 transition-colors flex items-center justify-center disabled:opacity-20 disabled:cursor-not-allowed"
      >
        <span className="text-[20px] leading-none">→</span>
      </button>

      {/* Slide counter */}
      <div className="absolute top-6 right-8 text-[11px] tracking-[0.12em] uppercase text-white/40">
        {index + 1} / {slides.length}
      </div>

      {/* Title chip */}
      <div className="absolute top-6 left-8 text-[11px] tracking-[0.12em] uppercase text-white/40">
        {collection.name}
      </div>

      {/* Esc hint */}
      <button
        onClick={() => router.push(`/collection/${token}`)}
        className="absolute bottom-6 right-8 text-[10px] tracking-[0.12em] uppercase text-white/40 hover:text-white/80 transition-colors"
      >
        Esc to exit
      </button>
    </div>
  )
}

function ProjectSlide({ project, caption }: { project: Project; caption: string }) {
  const hero = imgUrl(project.folderName, project.heroImage || project.thumbImage)
  const excerpt = (project.description || '').trim().slice(0, 320)

  return (
    <div className="w-full max-w-[1400px] grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
      <div className="aspect-[4/3] bg-white/5 rounded-[6px] overflow-hidden">
        {hero ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={hero} alt={project.projectName} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/30 text-[12px]">No image</div>
        )}
      </div>
      <div>
        <p className="text-[11px] tracking-[0.18em] uppercase text-white/40 mb-3">{project.client}</p>
        <h3 className="text-[2.4rem] sm:text-[3rem] font-[250] tracking-[-0.02em] leading-[1.08]">
          {project.projectName}
        </h3>
        {project.tagline && (
          <p className="text-[18px] sm:text-[20px] text-white/70 font-[300] mt-4">{project.tagline}</p>
        )}
        {excerpt && (
          <p className="text-[14px] text-white/50 font-[300] leading-[1.6] mt-6">
            {excerpt}{(project.description || '').length > 320 ? '…' : ''}
          </p>
        )}
        {caption && (
          <p className="text-[12px] text-white/40 italic mt-6 border-l border-white/20 pl-4">{caption}</p>
        )}
      </div>
    </div>
  )
}
