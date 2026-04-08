'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import type { MediaFile } from '@/lib/types'
import { isVideo, formatFileSize, getFileExt } from '@/lib/format'
import { isInUseImage } from '@/lib/media-naming'

interface Props {
  media: MediaFile[]
  folderName: string
  heroFilename?: string | null
  thumbFilename?: string | null
  onAddMedia?: () => void
  onDeleteMedia?: (filename: string) => void
  onSetHero?: (filename: string) => void
  onSetThumb?: (filename: string) => void
}

export function GalleryGrid({ media, folderName, heroFilename, thumbFilename, onAddMedia, onDeleteMedia, onSetHero, onSetThumb }: Props) {
  const editable = !!(onAddMedia || onDeleteMedia || onSetHero || onSetThumb)
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

  if (media.length === 0 && !editable) return null

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-[10px] font-[500] uppercase tracking-[0.1em] text-[var(--c-gray-400)]">
          Gallery
        </h3>
        {onAddMedia && (
          <button
            onClick={onAddMedia}
            className="text-[10px] font-[500] uppercase tracking-[0.08em] px-2.5 py-1 rounded-[var(--radius-sm)] border border-[var(--c-gray-200)] text-[var(--c-gray-600)] hover:bg-[var(--c-gray-50)] transition-colors"
          >
            + Add media
          </button>
        )}
      </div>
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
                <Image
                  src={src}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover"
                  loading="lazy"
                />
              )}
              {/* In-Use badge */}
              {isInUseImage(m.filename) && (
                <div className="absolute top-1.5 left-1.5 text-[9px] font-[500] uppercase tracking-[0.05em] text-white bg-black/70 px-1.5 py-0.5 rounded-[2px]">
                  In-Use
                </div>
              )}
              {/* Hero/Thumb labels */}
              {heroFilename === m.filename && (
                <div className="absolute top-1.5 right-1.5 text-[9px] font-[500] uppercase tracking-[0.05em] text-white bg-[var(--c-ai)]/90 px-1.5 py-0.5 rounded-[2px]">Hero</div>
              )}
              {thumbFilename === m.filename && heroFilename !== m.filename && (
                <div className="absolute top-1.5 right-1.5 text-[9px] font-[500] uppercase tracking-[0.05em] text-white bg-black/70 px-1.5 py-0.5 rounded-[2px]">Thumb</div>
              )}
              {/* Edit actions overlay */}
              {editable && (
                <div
                  className="absolute inset-x-0 top-0 flex items-start justify-end gap-1 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  {onSetHero && heroFilename !== m.filename && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onSetHero(m.filename) }}
                      className="text-[9px] font-[500] uppercase tracking-[0.05em] px-1.5 py-0.5 rounded-[2px] bg-white/90 text-[var(--c-gray-900)] hover:bg-white"
                      title="Set as hero"
                    >
                      Hero
                    </button>
                  )}
                  {onSetThumb && thumbFilename !== m.filename && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onSetThumb(m.filename) }}
                      className="text-[9px] font-[500] uppercase tracking-[0.05em] px-1.5 py-0.5 rounded-[2px] bg-white/90 text-[var(--c-gray-900)] hover:bg-white"
                      title="Set as thumbnail"
                    >
                      Thumb
                    </button>
                  )}
                  {onDeleteMedia && (
                    <button
                      onClick={(e) => { e.stopPropagation(); if (confirm(`Delete ${m.filename}?`)) onDeleteMedia(m.filename) }}
                      className="text-[10px] font-[600] leading-none px-1.5 py-0.5 rounded-[2px] bg-red-500/90 text-white hover:bg-red-600"
                      title="Delete"
                    >
                      ×
                    </button>
                  )}
                </div>
              )}
              {/* File info caption */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent px-2 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-1.5">
                <span className="text-[9px] font-[500] text-white/80 bg-white/20 px-1 py-0.5 rounded-[2px] uppercase">
                  {getFileExt(m.filename)}
                </span>
                {m.size && (
                  <span className="text-[9px] font-[400] text-white/60">
                    {formatFileSize(m.size)}
                  </span>
                )}
              </div>
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
            className="absolute top-4 right-4 md:top-8 md:right-8 text-white/40 hover:text-white transition-colors duration-200 z-10"
            onClick={() => setLightboxIndex(null)}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M5 5l14 14M19 5l-14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>

          {/* Left arrow */}
          {lightboxIndex > 0 && (
            <button
              className="absolute left-0 top-0 bottom-0 w-12 md:w-[100px] flex items-center justify-center text-white/25 hover:text-white transition-colors duration-200 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation()
                setLightboxIndex(lightboxIndex - 1)
              }}
            >
              <svg width="28" height="28" viewBox="0 0 40 40" fill="none" className="md:w-10 md:h-10">
                <path d="M25 8L13 20L25 32" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}

          {/* Right arrow */}
          {lightboxIndex < media.length - 1 && (
            <button
              className="absolute right-0 top-0 bottom-0 w-12 md:w-[100px] flex items-center justify-center text-white/25 hover:text-white transition-colors duration-200 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation()
                setLightboxIndex(lightboxIndex + 1)
              }}
            >
              <svg width="28" height="28" viewBox="0 0 40 40" fill="none" className="md:w-10 md:h-10">
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
          <div className="absolute bottom-4 md:bottom-8 text-[12px] text-white/30 font-[400] tabular-nums">
            {lightboxIndex + 1} / {media.length}
          </div>
        </div>
      )}
    </>
  )
}
