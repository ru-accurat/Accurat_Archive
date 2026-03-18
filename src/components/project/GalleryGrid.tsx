'use client'

import { useState, useEffect, useCallback } from 'react'
import type { MediaFile } from '@/lib/types'
import { isVideo } from '@/lib/format'

interface Props {
  media: MediaFile[]
  folderName: string
}

export function GalleryGrid({ media, folderName }: Props) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  // Keyboard navigation in lightbox
  const handleLightboxKey = useCallback(
    (e: KeyboardEvent) => {
      if (lightboxIndex === null) return
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setLightboxIndex((i) => (i !== null && i > 0 ? i - 1 : i))
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        setLightboxIndex((i) => (i !== null && i < media.length - 1 ? i + 1 : i))
      } else if (e.key === 'Escape') {
        e.preventDefault()
        setLightboxIndex(null)
      }
    },
    [lightboxIndex, media.length]
  )

  useEffect(() => {
    if (lightboxIndex !== null) {
      window.addEventListener('keydown', handleLightboxKey)
      return () => window.removeEventListener('keydown', handleLightboxKey)
    }
  }, [lightboxIndex, handleLightboxKey])

  if (media.length === 0) return null

  return (
    <>
      <h3 className="text-[10px] font-[500] uppercase tracking-[0.1em] text-[var(--c-gray-400)] mb-6">
        Gallery
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {media.map((m, i) => {
          const src = m.path
          const video = isVideo(m.filename)
          return (
            <div
              key={m.filename}
              className="relative aspect-[4/3] bg-[var(--c-gray-100)] overflow-hidden cursor-pointer hover:opacity-80 transition-opacity duration-200 group"
              onClick={() => setLightboxIndex(i)}
            >
              {video ? (
                <>
                  <video src={src} className="w-full h-full object-cover" preload="metadata" />
                  {/* Play icon overlay */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center group-hover:bg-black/70 transition-colors duration-200">
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M6 3.5L16.5 10L6 16.5V3.5Z" fill="white" />
                      </svg>
                    </div>
                  </div>
                </>
              ) : (
                <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" />
              )}
            </div>
          )
        })}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-[var(--c-black)]/95 flex items-center justify-center"
          onClick={() => setLightboxIndex(null)}
        >
          {/* Close button */}
          <button
            className="absolute top-8 right-8 text-white/40 hover:text-white transition-colors duration-200 z-10"
            onClick={() => setLightboxIndex(null)}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M5 5l14 14M19 5l-14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>

          {/* Left arrow */}
          {lightboxIndex > 0 && (
            <button
              className="absolute left-0 top-0 bottom-0 w-[100px] flex items-center justify-center text-white/25 hover:text-white transition-colors duration-200 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation()
                setLightboxIndex(lightboxIndex - 1)
              }}
            >
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <path d="M25 8L13 20L25 32" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}

          {/* Right arrow */}
          {lightboxIndex < media.length - 1 && (
            <button
              className="absolute right-0 top-0 bottom-0 w-[100px] flex items-center justify-center text-white/25 hover:text-white transition-colors duration-200 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation()
                setLightboxIndex(lightboxIndex + 1)
              }}
            >
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <path d="M15 8L27 20L15 32" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}

          {/* Image/video */}
          <div className="max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            {isVideo(media[lightboxIndex].filename) ? (
              <video
                src={media[lightboxIndex].path}
                className="max-w-full max-h-[90vh]"
                controls
                autoPlay
              />
            ) : (
              <img
                src={media[lightboxIndex].path}
                alt=""
                className="max-w-full max-h-[90vh] object-contain"
              />
            )}
          </div>

          {/* Counter */}
          <div className="absolute bottom-8 text-[12px] text-white/30 font-[400] tabular-nums">
            {lightboxIndex + 1} / {media.length}
          </div>
        </div>
      )}
    </>
  )
}
