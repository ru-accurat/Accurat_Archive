'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import type { Project } from '@/lib/types'
import { pdfUrl } from '@/lib/media-url'
import { HeroSection } from '@/components/project/HeroSection'
import { TagChips } from '@/components/project/TagChips'
import { TextBlock } from '@/components/project/TextBlock'
import { GalleryGrid } from '@/components/project/GalleryGrid'
import { TeamList } from '@/components/project/TeamList'
import { UrlLinks } from '@/components/project/UrlLinks'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

function buildMediaList(project: Project) {
  const files = project.mediaOrder || []
  return files.map((filename) => ({
    filename,
    path: `${SUPABASE_URL}/storage/v1/object/public/project-media/${project.folderName}/${filename}`,
    type: (/\.(mp4|webm|mov)$/i.test(filename) ? 'video' : /\.gif$/i.test(filename) ? 'gif' : 'image') as 'image' | 'video' | 'gif',
  }))
}

export default function SharedProjectPage() {
  const { token } = useParams<{ token: string }>()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    fetch(`/api/public/share/${token}`)
      .then((r) => {
        if (!r.ok) { setNotFound(true); setLoading(false); return null }
        return r.json()
      })
      .then((data) => {
        if (data) setProject(data)
        setLoading(false)
      })
      .catch(() => { setNotFound(true); setLoading(false) })
  }, [token])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-[var(--c-gray-400)] text-[13px]">
        Loading...
      </div>
    )
  }

  if (notFound || !project) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-[var(--c-gray-400)] text-[13px]">
        This link is no longer available.
      </div>
    )
  }

  const p = project
  const allMedia = buildMediaList(p)
  const heroImage = p.heroImage || (allMedia.length > 0 ? allMedia[0].filename : undefined)
  const heroMedia = heroImage ? allMedia.find((m) => m.filename === heroImage) ?? null : null
  const galleryMedia = allMedia.filter((m) => m.filename !== heroImage)

  return (
    <>
      <div className="bg-[var(--c-black)] text-white">
        <HeroSection media={heroMedia} folderName={p.folderName} projectName={p.projectName} />
        <div className="max-w-[1040px] px-4 sm:px-6 md:px-[48px] pt-16 pb-12">
          <h1 className="text-[1.8rem] sm:text-[2.2rem] md:text-[2.8rem] font-[250] tracking-[-0.03em] leading-[1.1] mb-[12px] text-white">
            {p.projectName}
          </h1>
          <div className="flex flex-wrap items-center gap-3 sm:gap-5 text-[13px] sm:text-[15px] mb-[24px]">
            <span className="font-[500] text-white/90">{p.client}</span>
            {(p.start || p.end) && (
              <span className="text-white/40 font-[400] tabular-nums">
                {p.start}{p.end && p.end !== p.start ? `\u2013${p.end}` : ''}
              </span>
            )}
            {p.section && (
              <span className="text-[12px] font-[450] tracking-[0.06em] uppercase text-white/40">{p.section}</span>
            )}
          </div>
          <TagChips domains={p.domains} services={p.services} output={p.output} dark />
        </div>
      </div>

      <div className="bg-[var(--c-white)]">
        <div className="max-w-[1040px] px-4 sm:px-6 md:px-[48px] pt-16 pb-12">
          {p.tagline && <div className="mb-12"><TextBlock title="Tagline" content={p.tagline} large /></div>}
          {p.description && <TextBlock title="Description" content={p.description} />}
        </div>
      </div>

      {(p.challenge || p.solution) && (
        <div className="bg-[var(--c-white)]">
          <div className="max-w-[1040px] px-4 sm:px-6 md:px-[48px] py-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16">
              <TextBlock title="Challenge" content={p.challenge} />
              <TextBlock title="Solution" content={p.solution} />
            </div>
          </div>
        </div>
      )}

      {p.deliverables && (
        <div className="bg-[var(--c-white)]">
          <div className="max-w-[1040px] px-4 sm:px-6 md:px-[48px] py-12">
            <TextBlock title="Deliverables" content={p.deliverables} />
          </div>
        </div>
      )}

      {p.clientQuotes && (
        <div className="bg-[var(--c-black)]">
          <div className="max-w-[1040px] px-4 sm:px-6 md:px-[48px] py-12">
            <TextBlock title="Client Quote" content={p.clientQuotes} large dark />
          </div>
        </div>
      )}

      <div className="bg-[var(--c-white)]">
        <div className="max-w-[1040px] px-4 sm:px-6 md:px-[48px] pt-12 pb-16">
          {(p.urls.filter(Boolean).length > 0 || p.team.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 mb-12">
              <UrlLinks urls={p.urls} />
              <TeamList team={p.team} />
            </div>
          )}

          {(p.pdfFiles?.length ?? 0) > 0 && (
            <div className="mb-12">
              <h3 className="text-[10px] font-[500] uppercase tracking-[0.1em] text-[var(--c-gray-400)] mb-4">
                Documents
              </h3>
              <div className="space-y-2">
                {p.pdfFiles!.map((filename) => (
                  <a
                    key={filename}
                    href={pdfUrl(p.folderName, filename)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-4 py-3 rounded-[var(--radius-sm)] border border-[var(--c-gray-200)] bg-[var(--c-gray-50)] hover:bg-[var(--c-gray-100)] transition-colors duration-150"
                  >
                    <svg width="20" height="24" viewBox="0 0 20 24" fill="none" className="flex-shrink-0">
                      <rect x="0.5" y="0.5" width="19" height="23" rx="2" stroke="var(--c-gray-300)" />
                      <text x="10" y="16" textAnchor="middle" fill="var(--c-gray-400)" fontSize="7" fontWeight="600">PDF</text>
                    </svg>
                    <span className="flex-1 text-[13px] font-[400] text-[var(--c-gray-700)]">
                      {filename.replace(/\.pdf$/i, '')}
                    </span>
                    <span className="text-[11px] font-[450] text-[var(--c-gray-400)]">View &nearr;</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          <GalleryGrid media={galleryMedia} folderName={p.folderName} />
        </div>
      </div>
    </>
  )
}
