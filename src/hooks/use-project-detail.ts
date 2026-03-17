'use client'

import { useState, useEffect } from 'react'
import type { Project, MediaFile } from '@/lib/types'
import { api } from '@/lib/api-client'

export function useProjectDetail(id: string | undefined) {
  const [project, setProject] = useState<Project | null>(null)
  const [media, setMedia] = useState<MediaFile[]>([])
  const [specialMedia, setSpecialMedia] = useState<{ header: string | null; thumb: string | null }>({ header: null, thumb: null })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const [proj, med] = await Promise.all([
          api.getProject(id!),
          api.getProjectMedia(id!)
        ])
        if (!cancelled) {
          setProject(proj)
          setMedia(med)
          if (proj?.folderName) {
            const special = await api.getSpecialMedia(proj.folderName)
            if (!cancelled) setSpecialMedia(special)
          }
          setLoading(false)
        }
      } catch (err) {
        console.error('Failed to load project:', err)
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [id])

  const headerFile = specialMedia.header
    ? media.find((m) => m.filename === specialMedia.header) || null
    : null
  const savedHero = !headerFile && project?.heroImage
    ? media.find((m) => m.filename === project.heroImage) || null
    : null
  const heroMedia = headerFile || savedHero || media[0] || null
  const galleryMedia = media.filter((m) => m.filename !== specialMedia.header && m.filename !== specialMedia.thumb)

  return { project, media, heroMedia, galleryMedia, specialMedia, loading, setProject }
}
