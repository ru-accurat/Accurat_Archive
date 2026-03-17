'use client'

import { useState } from 'react'
import type { MediaFile } from '@/lib/types'
import { mediaUrl } from '@/lib/media-url'
import { isVideo } from '@/lib/format'

interface Props {
  media: MediaFile[]
  folderName: string
  heroIndex: number
  thumbIndex: number
  onHeroChange: (index: number) => void
  onThumbChange: (index: number) => void
  onGalleryReorder: (orderedFilenames: string[]) => void
  onAddMedia: () => void
  onDeleteMedia: (filename: string) => void
}

export function MediaManager({
  media,
  folderName,
  heroIndex,
  thumbIndex,
  onHeroChange,
  onThumbChange,
  onGalleryReorder,
  onAddMedia,
  onDeleteMedia
}: Props) {
  const [selectingFor, setSelectingFor] = useState<'hero' | 'thumb' | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const handleSelect = (index: number) => {
    if (!selectingFor) return

    if (selectingFor === 'hero') {
      onHeroChange(index)
    } else if (selectingFor === 'thumb') {
      onThumbChange(index)
    }
    setSelectingFor(null)
  }

  const handleDelete = (filename: string) => {
    if (confirmDelete === filename) {
      onDeleteMedia(filename)
      setConfirmDelete(null)
    } else {
      setConfirmDelete(filename)
    }
  }

  return (
    <div className="py-8 mt-4 border-t border-[var(--c-gray-200)]">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-[10px] font-[500] uppercase tracking-[0.1em] text-[var(--c-gray-400)]">
          Media Layout
        </h3>
        <button
          onClick={onAddMedia}
          className="text-[11px] font-[450] tracking-[0.02em] px-4 py-1.5 rounded-[var(--radius-sm)] bg-[var(--c-gray-900)] text-white hover:bg-[var(--c-gray-800)] transition-colors duration-200"
        >
          + Add Media
        </button>
      </div>

      {/* Hero + Thumb selections side by side */}
      <div className="flex gap-10 mb-8">
        {/* Hero selection */}
        <div>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-[12px] font-[450] text-[var(--c-gray-600)]">Header Image</span>
            <button
              onClick={() => setSelectingFor(selectingFor === 'hero' ? null : 'hero')}
              className={`text-[10px] font-[450] px-2.5 py-1 rounded-[var(--radius-sm)] transition-colors duration-200 ${
                selectingFor === 'hero'
                  ? 'bg-[var(--c-gray-900)] text-white'
                  : 'bg-[var(--c-gray-100)] text-[var(--c-gray-500)] hover:bg-[var(--c-gray-200)]'
              }`}
            >
              {selectingFor === 'hero' ? 'Select below...' : 'Change'}
            </button>
          </div>
          {media[heroIndex] && (
            <div className="w-48 h-28 overflow-hidden bg-[var(--c-gray-100)]">
              {isVideo(media[heroIndex].filename) ? (
                <video
                  src={mediaUrl(folderName, media[heroIndex].filename)}
                  className="w-full h-full object-cover"
                  preload="metadata"
                />
              ) : (
                <img
                  src={mediaUrl(folderName, media[heroIndex].filename)}
                  className="w-full h-full object-cover"
                  alt="Hero"
                />
              )}
            </div>
          )}
        </div>

        {/* Thumbnail selection */}
        <div>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-[12px] font-[450] text-[var(--c-gray-600)]">Thumbnail</span>
            <button
              onClick={() => setSelectingFor(selectingFor === 'thumb' ? null : 'thumb')}
              className={`text-[10px] font-[450] px-2.5 py-1 rounded-[var(--radius-sm)] transition-colors duration-200 ${
                selectingFor === 'thumb'
                  ? 'bg-[var(--c-gray-900)] text-white'
                  : 'bg-[var(--c-gray-100)] text-[var(--c-gray-500)] hover:bg-[var(--c-gray-200)]'
              }`}
            >
              {selectingFor === 'thumb' ? 'Select below...' : 'Change'}
            </button>
          </div>
          {media[thumbIndex] !== undefined && media[thumbIndex] ? (
            <div className="w-28 h-28 overflow-hidden bg-[var(--c-gray-100)]">
              {isVideo(media[thumbIndex].filename) ? (
                <video
                  src={mediaUrl(folderName, media[thumbIndex].filename)}
                  className="w-full h-full object-cover"
                  preload="metadata"
                />
              ) : (
                <img
                  src={mediaUrl(folderName, media[thumbIndex].filename)}
                  className="w-full h-full object-cover"
                  alt="Thumbnail"
                />
              )}
            </div>
          ) : (
            <div className="w-28 h-28 bg-[var(--c-gray-100)] flex items-center justify-center text-[var(--c-gray-300)] text-[10px]">
              Same as header
            </div>
          )}
        </div>
      </div>

      {/* All media grid */}
      <div>
        <span className="text-[12px] font-[450] text-[var(--c-gray-600)] block mb-3">
          {selectingFor ? `Click an image to set as ${selectingFor === 'hero' ? 'header' : 'thumbnail'}:` : 'All Media'}
        </span>
        <div className="grid grid-cols-6 gap-2">
          {media.map((m, i) => {
            const isHero = i === heroIndex
            const isThumb = i === thumbIndex
            const src = mediaUrl(folderName, m.filename)
            const isSelecting = selectingFor !== null
            const isConfirmingDelete = confirmDelete === m.filename

            return (
              <div
                key={m.filename}
                className={`relative group aspect-[4/3] overflow-hidden bg-[var(--c-gray-100)] transition-all duration-200 ${
                  isSelecting ? 'cursor-pointer hover:ring-2 hover:ring-[var(--c-gray-900)]' : ''
                } ${isHero || isThumb ? 'ring-2 ring-[var(--c-gray-900)]' : ''}`}
                onClick={() => isSelecting && handleSelect(i)}
              >
                {isVideo(m.filename) ? (
                  <video src={src} className="w-full h-full object-cover" preload="metadata" />
                ) : (
                  <img src={src} className="w-full h-full object-cover" loading="lazy" alt="" />
                )}

                {/* Badges */}
                {(isHero || isThumb) && (
                  <div className="absolute top-1 left-1 flex gap-1">
                    {isHero && (
                      <span className="px-1.5 py-0.5 bg-[var(--c-gray-900)] text-white text-[9px] font-[500] rounded-[2px]">
                        Header
                      </span>
                    )}
                    {isThumb && (
                      <span className="px-1.5 py-0.5 bg-[var(--c-gray-900)] text-white text-[9px] font-[500] rounded-[2px]">
                        Thumb
                      </span>
                    )}
                  </div>
                )}

                {/* Delete button — only visible on hover when not selecting */}
                {!isSelecting && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(m.filename)
                    }}
                    className={`absolute top-1 right-1 w-5 h-5 flex items-center justify-center rounded-[2px] text-[11px] font-[600] transition-all duration-150 ${
                      isConfirmingDelete
                        ? 'bg-red-500 text-white opacity-100'
                        : 'bg-black/50 text-white/80 opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white'
                    }`}
                    title={isConfirmingDelete ? 'Click again to confirm' : 'Delete'}
                  >
                    &times;
                  </button>
                )}

                {/* Confirm delete overlay */}
                {isConfirmingDelete && !isSelecting && (
                  <div className="absolute inset-0 bg-red-500/20 flex items-end justify-center pb-1.5">
                    <span className="text-[9px] font-[500] text-red-600 bg-white/90 px-2 py-0.5 rounded-[2px]">
                      Click &times; again to delete
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {media.length === 0 && (
          <div className="text-[13px] text-[var(--c-gray-300)] font-[350] py-10 text-center">
            No media files yet. Click &quot;+ Add Media&quot; to upload images or videos.
          </div>
        )}
      </div>
    </div>
  )
}
