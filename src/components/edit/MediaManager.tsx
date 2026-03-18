'use client'

import { useState, useCallback, useRef } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { MediaFile } from '@/lib/types'
import { mediaUrl, logoUrl, pdfUrl } from '@/lib/media-url'
import { isVideo, formatFileSize, getFileExt } from '@/lib/format'

/* ── Types ─────────────────────────────────────────────── */

interface Props {
  media: MediaFile[]
  folderName: string
  heroIndex: number
  thumbIndex: number
  clientLogo: string | null
  pdfFiles: string[]
  onHeroChange: (index: number) => void
  onThumbChange: (index: number) => void
  onGalleryReorder: (orderedFilenames: string[]) => void
  onAddMedia: () => void
  onDeleteMedia: (filenames: string[]) => void
  onUploadLogo: () => void
  onDeleteLogo: () => void
  onAddPdfs: () => void
  onDeletePdfs: (filenames: string[]) => void
  onRenamePdf: (oldName: string, newName: string) => void
}

/* ── Sortable Item ─────────────────────────────────────── */

function SortableMediaItem({
  item,
  index,
  folderName,
  isHero,
  isThumb,
  isSelecting,
  deleteMode,
  isSelectedForDelete,
  onSelect,
  onToggleDelete,
}: {
  item: MediaFile
  index: number
  folderName: string
  isHero: boolean
  isThumb: boolean
  isSelecting: boolean
  deleteMode: boolean
  isSelectedForDelete: boolean
  onSelect: (index: number) => void
  onToggleDelete: (filename: string) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.filename, disabled: isSelecting || deleteMode })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.5 : 1,
  }

  const src = mediaUrl(folderName, item.filename)

  const handleClick = () => {
    if (isSelecting) onSelect(index)
    else if (deleteMode) onToggleDelete(item.filename)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`relative group aspect-[4/3] overflow-hidden bg-[var(--c-gray-100)] transition-all duration-200 select-none ${
        isDragging ? 'shadow-lg ring-2 ring-[var(--c-gray-400)]' : ''
      } ${isSelecting ? 'cursor-pointer hover:ring-2 hover:ring-[var(--c-gray-900)]' : ''} ${
        deleteMode ? 'cursor-pointer' : ''
      } ${!isSelecting && !deleteMode ? 'cursor-grab active:cursor-grabbing' : ''} ${
        isHero || isThumb ? 'ring-2 ring-[var(--c-gray-900)]' : ''
      } ${isSelectedForDelete ? 'ring-2 ring-red-500' : ''}`}
      onClick={handleClick}
    >
      {isVideo(item.filename) ? (
        <video src={src} className="w-full h-full object-cover pointer-events-none" preload="metadata" />
      ) : (
        <img src={src} className="w-full h-full object-cover pointer-events-none" loading="lazy" alt="" />
      )}

      {/* Hero / Thumb badges */}
      {(isHero || isThumb) && !deleteMode && (
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

      {/* Delete mode checkbox */}
      {deleteMode && (
        <div className="absolute top-1.5 right-1.5">
          <div
            className={`w-5 h-5 rounded-[3px] border-2 flex items-center justify-center transition-colors duration-150 ${
              isSelectedForDelete
                ? 'bg-red-500 border-red-500 text-white'
                : 'bg-white/80 border-[var(--c-gray-300)]'
            }`}
          >
            {isSelectedForDelete && (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
        </div>
      )}

      {/* Delete mode overlay for selected items */}
      {deleteMode && isSelectedForDelete && (
        <div className="absolute inset-0 bg-red-500/15" />
      )}

      {/* File info caption */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-1.5 py-1 flex items-center gap-1.5">
        <span className="text-[8px] font-[500] text-white/80 bg-white/20 px-1 py-0.5 rounded-[2px] uppercase">
          {getFileExt(item.filename)}
        </span>
        {item.size && (
          <span className="text-[8px] font-[400] text-white/60">
            {formatFileSize(item.size)}
          </span>
        )}
      </div>
    </div>
  )
}

/* ── Main Component ────────────────────────────────────── */

export function MediaManager({
  media,
  folderName,
  heroIndex,
  thumbIndex,
  clientLogo,
  pdfFiles,
  onHeroChange,
  onThumbChange,
  onGalleryReorder,
  onAddMedia,
  onDeleteMedia,
  onUploadLogo,
  onDeleteLogo,
  onAddPdfs,
  onDeletePdfs,
  onRenamePdf,
}: Props) {
  const [selectingFor, setSelectingFor] = useState<'hero' | 'thumb' | null>(null)
  const [deleteMode, setDeleteMode] = useState(false)
  const [selectedForDelete, setSelectedForDelete] = useState<Set<string>>(new Set())
  const [pdfDeleteMode, setPdfDeleteMode] = useState(false)
  const [selectedPdfsForDelete, setSelectedPdfsForDelete] = useState<Set<string>>(new Set())
  const [editingPdfName, setEditingPdfName] = useState<string | null>(null)
  const [pdfNameInput, setPdfNameInput] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleSelect = (index: number) => {
    if (!selectingFor) return
    if (selectingFor === 'hero') onHeroChange(index)
    else if (selectingFor === 'thumb') onThumbChange(index)
    setSelectingFor(null)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = media.findIndex((m) => m.filename === active.id)
    const newIndex = media.findIndex((m) => m.filename === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const newOrder = arrayMove(
      media.map((m) => m.filename),
      oldIndex,
      newIndex
    )
    onGalleryReorder(newOrder)
  }

  const toggleDeleteSelection = useCallback((filename: string) => {
    setSelectedForDelete((prev) => {
      const next = new Set(prev)
      if (next.has(filename)) next.delete(filename)
      else next.add(filename)
      return next
    })
  }, [])

  const enterDeleteMode = () => {
    setDeleteMode(true)
    setSelectedForDelete(new Set())
    setSelectingFor(null)
  }

  const cancelDeleteMode = () => {
    setDeleteMode(false)
    setSelectedForDelete(new Set())
  }

  const confirmBatchDelete = () => {
    if (selectedForDelete.size === 0) return
    onDeleteMedia(Array.from(selectedForDelete))
    setDeleteMode(false)
    setSelectedForDelete(new Set())
  }

  const isSelecting = selectingFor !== null

  return (
    <div className="py-8 mt-4 border-t border-[var(--c-gray-200)]">
      {/* ── Client Logo Section ─────────────────────── */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[10px] font-[500] uppercase tracking-[0.1em] text-[var(--c-gray-400)]">
            Client Logo
          </h3>
          <div className="flex gap-2">
            <button
              onClick={onUploadLogo}
              className="text-[11px] font-[450] tracking-[0.02em] px-3 py-1.5 rounded-[var(--radius-sm)] bg-[var(--c-gray-100)] text-[var(--c-gray-500)] hover:bg-[var(--c-gray-200)] transition-colors duration-200"
            >
              {clientLogo ? 'Replace' : '+ Upload'} Logo
            </button>
            {clientLogo && (
              <button
                onClick={onDeleteLogo}
                className="text-[11px] font-[450] tracking-[0.02em] px-3 py-1.5 rounded-[var(--radius-sm)] text-red-500 hover:bg-red-50 transition-colors duration-200"
              >
                Delete
              </button>
            )}
          </div>
        </div>
        {clientLogo ? (
          <div className="w-40 h-20 bg-[var(--c-gray-50)] border border-[var(--c-gray-200)] rounded-[var(--radius-sm)] flex items-center justify-center p-3">
            <img
              src={logoUrl(clientLogo)}
              alt="Client logo"
              className="max-w-full max-h-full object-contain"
            />
          </div>
        ) : (
          <div className="w-40 h-20 bg-[var(--c-gray-50)] border border-dashed border-[var(--c-gray-200)] rounded-[var(--radius-sm)] flex items-center justify-center">
            <span className="text-[11px] text-[var(--c-gray-300)]">No logo</span>
          </div>
        )}
      </div>

      {/* ── Media Layout Section ────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-[10px] font-[500] uppercase tracking-[0.1em] text-[var(--c-gray-400)]">
          Media Layout
        </h3>
        <div className="flex gap-2">
          {!deleteMode && (
            <>
              <button
                onClick={enterDeleteMode}
                className="text-[11px] font-[450] tracking-[0.02em] px-3 py-1.5 rounded-[var(--radius-sm)] text-red-500 hover:bg-red-50 transition-colors duration-200"
              >
                Delete Media
              </button>
              <button
                onClick={onAddMedia}
                className="text-[11px] font-[450] tracking-[0.02em] px-4 py-1.5 rounded-[var(--radius-sm)] bg-[var(--c-gray-900)] text-white hover:bg-[var(--c-gray-800)] transition-colors duration-200"
              >
                + Add Media
              </button>
            </>
          )}
          {deleteMode && (
            <>
              <button
                onClick={cancelDeleteMode}
                className="text-[11px] font-[450] tracking-[0.02em] px-3 py-1.5 rounded-[var(--radius-sm)] text-[var(--c-gray-400)] hover:text-[var(--c-gray-600)] transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={confirmBatchDelete}
                disabled={selectedForDelete.size === 0}
                className="text-[11px] font-[450] tracking-[0.02em] px-4 py-1.5 rounded-[var(--radius-sm)] bg-red-500 text-white hover:bg-red-600 transition-colors duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Delete {selectedForDelete.size > 0 ? `(${selectedForDelete.size})` : ''}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Hero + Thumb selections side by side */}
      {!deleteMode && (
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
      )}

      {/* All media grid — drag-and-drop enabled */}
      <div>
        <span className="text-[12px] font-[450] text-[var(--c-gray-600)] block mb-3">
          {isSelecting
            ? `Click an image to set as ${selectingFor === 'hero' ? 'header' : 'thumbnail'}:`
            : deleteMode
              ? 'Select media to delete:'
              : 'All Media — drag to reorder'}
        </span>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={media.map((m) => m.filename)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-6 gap-2">
              {media.map((m, i) => (
                <SortableMediaItem
                  key={m.filename}
                  item={m}
                  index={i}
                  folderName={folderName}
                  isHero={i === heroIndex}
                  isThumb={i === thumbIndex}
                  isSelecting={isSelecting}
                  deleteMode={deleteMode}
                  isSelectedForDelete={selectedForDelete.has(m.filename)}
                  onSelect={handleSelect}
                  onToggleDelete={toggleDeleteSelection}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {media.length === 0 && (
          <div className="text-[13px] text-[var(--c-gray-300)] font-[350] py-10 text-center">
            No media files yet. Click &quot;+ Add Media&quot; to upload images or videos.
          </div>
        )}
      </div>

      {/* ── Documents (PDF) Section ──────────────────── */}
      <div className="mt-8 pt-8 border-t border-[var(--c-gray-200)]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[10px] font-[500] uppercase tracking-[0.1em] text-[var(--c-gray-400)]">
            Documents
          </h3>
          <div className="flex gap-2">
            {!pdfDeleteMode && (
              <>
                {pdfFiles.length > 0 && (
                  <button
                    onClick={() => { setPdfDeleteMode(true); setSelectedPdfsForDelete(new Set()) }}
                    className="text-[11px] font-[450] tracking-[0.02em] px-3 py-1.5 rounded-[var(--radius-sm)] text-red-500 hover:bg-red-50 transition-colors duration-200"
                  >
                    Delete PDFs
                  </button>
                )}
                <button
                  onClick={onAddPdfs}
                  className="text-[11px] font-[450] tracking-[0.02em] px-4 py-1.5 rounded-[var(--radius-sm)] bg-[var(--c-gray-900)] text-white hover:bg-[var(--c-gray-800)] transition-colors duration-200"
                >
                  + Add PDF
                </button>
              </>
            )}
            {pdfDeleteMode && (
              <>
                <button
                  onClick={() => { setPdfDeleteMode(false); setSelectedPdfsForDelete(new Set()) }}
                  className="text-[11px] font-[450] tracking-[0.02em] px-3 py-1.5 rounded-[var(--radius-sm)] text-[var(--c-gray-400)] hover:text-[var(--c-gray-600)] transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (selectedPdfsForDelete.size > 0) {
                      onDeletePdfs(Array.from(selectedPdfsForDelete))
                      setPdfDeleteMode(false)
                      setSelectedPdfsForDelete(new Set())
                    }
                  }}
                  disabled={selectedPdfsForDelete.size === 0}
                  className="text-[11px] font-[450] tracking-[0.02em] px-4 py-1.5 rounded-[var(--radius-sm)] bg-red-500 text-white hover:bg-red-600 transition-colors duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Delete {selectedPdfsForDelete.size > 0 ? `(${selectedPdfsForDelete.size})` : ''}
                </button>
              </>
            )}
          </div>
        </div>

        {pdfFiles.length === 0 && (
          <div className="text-[13px] text-[var(--c-gray-300)] font-[350] py-6 text-center">
            No documents attached. Click &quot;+ Add PDF&quot; to upload.
          </div>
        )}

        {pdfFiles.length > 0 && (
          <div className="space-y-2">
            {pdfFiles.map((filename) => {
              const displayName = filename.replace(/\.pdf$/i, '')
              const isEditing = editingPdfName === filename
              const isSelectedForPdfDelete = selectedPdfsForDelete.has(filename)

              return (
                <div
                  key={filename}
                  className={`flex items-center gap-3 px-4 py-3 rounded-[var(--radius-sm)] border transition-colors duration-150 ${
                    isSelectedForPdfDelete
                      ? 'border-red-300 bg-red-50'
                      : 'border-[var(--c-gray-200)] bg-[var(--c-gray-50)]'
                  }`}
                >
                  {/* PDF icon */}
                  <svg width="20" height="24" viewBox="0 0 20 24" fill="none" className="flex-shrink-0">
                    <rect x="0.5" y="0.5" width="19" height="23" rx="2" stroke="var(--c-gray-300)" />
                    <text x="10" y="16" textAnchor="middle" fill="var(--c-gray-400)" fontSize="7" fontWeight="600">PDF</text>
                  </svg>

                  {/* Editable name */}
                  {isEditing ? (
                    <input
                      value={pdfNameInput}
                      onChange={(e) => setPdfNameInput(e.target.value)}
                      onBlur={() => {
                        if (pdfNameInput.trim() && pdfNameInput.trim() !== displayName) {
                          onRenamePdf(filename, pdfNameInput.trim())
                        }
                        setEditingPdfName(null)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          if (pdfNameInput.trim() && pdfNameInput.trim() !== displayName) {
                            onRenamePdf(filename, pdfNameInput.trim())
                          }
                          setEditingPdfName(null)
                        } else if (e.key === 'Escape') {
                          setEditingPdfName(null)
                        }
                      }}
                      autoFocus
                      className="flex-1 text-[13px] font-[400] text-[var(--c-gray-700)] bg-white border border-[var(--c-gray-300)] rounded px-2 py-1 outline-none focus:border-[var(--c-gray-500)]"
                    />
                  ) : (
                    <span
                      className="flex-1 text-[13px] font-[400] text-[var(--c-gray-700)] cursor-pointer hover:text-[var(--c-gray-900)] transition-colors"
                      onClick={() => {
                        if (!pdfDeleteMode) {
                          setEditingPdfName(filename)
                          setPdfNameInput(displayName)
                        }
                      }}
                      title="Click to rename"
                    >
                      {displayName}
                    </span>
                  )}

                  {/* Delete mode checkbox */}
                  {pdfDeleteMode && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPdfsForDelete((prev) => {
                          const next = new Set(prev)
                          if (next.has(filename)) next.delete(filename)
                          else next.add(filename)
                          return next
                        })
                      }}
                      className="flex-shrink-0"
                    >
                      <div
                        className={`w-5 h-5 rounded-[3px] border-2 flex items-center justify-center transition-colors duration-150 ${
                          isSelectedForPdfDelete
                            ? 'bg-red-500 border-red-500 text-white'
                            : 'bg-white border-[var(--c-gray-300)]'
                        }`}
                      >
                        {isSelectedForPdfDelete && (
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                    </button>
                  )}

                  {/* View link (when not in delete mode) */}
                  {!pdfDeleteMode && (
                    <a
                      href={pdfUrl(folderName, filename)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-[450] text-[var(--c-gray-400)] hover:text-[var(--c-gray-700)] transition-colors"
                    >
                      View ↗
                    </a>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
