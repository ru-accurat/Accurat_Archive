'use client'

import { useState, useCallback } from 'react'
import type { MediaFile } from '@/lib/types'
import { mediaUrl } from '@/lib/media-url'

interface InUseGeneratorProps {
  open: boolean
  projectId: string
  folderName: string
  media: MediaFile[]
  onClose: () => void
  onImageSaved: (filename: string, setAsThumbnail: boolean) => void
}

type Step = 'pick-image' | 'notes' | 'generating' | 'results'

interface GeneratedImage {
  data: string
  mimeType: string
}

export function InUseGenerator({ open, projectId, folderName, media, onClose, onImageSaved }: InUseGeneratorProps) {
  const [step, setStep] = useState<Step>('pick-image')
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [images, setImages] = useState<GeneratedImage[]>([])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [setAsThumbnail, setSetAsThumbnail] = useState(false)

  const reset = useCallback(() => {
    setStep('pick-image')
    setSelectedImage(null)
    setNotes('')
    setImages([])
    setError(null)
    setSaving(false)
    setSetAsThumbnail(false)
  }, [])

  const handleClose = useCallback(() => {
    reset()
    onClose()
  }, [reset, onClose])

  const handleGenerate = useCallback(async () => {
    if (!selectedImage) return
    setStep('generating')
    setError(null)
    setImages([])

    try {
      const res = await fetch('/api/ai/generate-inuse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          imageFilename: selectedImage,
          notes: notes.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (data.success && data.images?.length > 0) {
        setImages(data.images)
        setStep('results')
      } else {
        setError(data.error || 'Generation failed')
        setStep('notes')
      }
    } catch (err) {
      setError(String(err))
      setStep('notes')
    }
  }, [projectId, selectedImage, notes])

  const handleAccept = useCallback(async (index: number) => {
    const img = images[index]
    if (!img) return
    setSaving(true)

    try {
      const res = await fetch('/api/ai/generate-inuse/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          imageBase64: img.data,
          imageMimeType: img.mimeType,
          setAsThumbnail,
        }),
      })
      const data = await res.json()
      if (data.success) {
        onImageSaved(data.filename, !!setAsThumbnail)
        handleClose()
      } else {
        setError(data.error || 'Save failed')
        setSaving(false)
      }
    } catch (err) {
      setError(String(err))
      setSaving(false)
    }
  }, [images, projectId, setAsThumbnail, onImageSaved, handleClose])

  if (!open) return null

  // Filter to images only (no PDFs, etc.)
  const imageMedia = media.filter(m => {
    const ext = m.filename.toLowerCase()
    return ext.endsWith('.png') || ext.endsWith('.jpg') || ext.endsWith('.jpeg') || ext.endsWith('.webp')
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-[var(--c-white)] rounded-[var(--radius-md)] shadow-xl w-[90vw] max-w-[800px] max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--c-gray-100)]">
          <div className="flex items-center gap-3">
            <h2 className="text-[16px] font-[450] text-[var(--c-gray-900)]">
              Generate In-Use Image
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">Gemini</span>
          </div>
          <button onClick={handleClose} className="text-[var(--c-gray-400)] hover:text-[var(--c-gray-700)]">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Step 1: Pick source image */}
          {step === 'pick-image' && (
            <div>
              <p className="text-[13px] text-[var(--c-gray-600)] mb-4">
                Select a source screenshot. The AI will place it on a device screen in a photorealistic setting.
              </p>
              {imageMedia.length === 0 ? (
                <p className="text-[12px] text-[var(--c-gray-400)] italic">No images in this project&apos;s media.</p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {imageMedia.map((m) => {
                    const url = mediaUrl(folderName, m.filename)
                    const isSelected = selectedImage === m.filename
                    return (
                      <button
                        key={m.filename}
                        onClick={() => setSelectedImage(m.filename)}
                        className={`relative aspect-[4/3] rounded-[var(--radius-sm)] overflow-hidden border-2 transition-all ${
                          isSelected ? 'border-[var(--c-gray-900)] ring-2 ring-[var(--c-gray-900)]/20' : 'border-transparent hover:border-[var(--c-gray-300)]'
                        }`}
                      >
                        <img src={url} alt={m.filename} className="w-full h-full object-cover" />
                        {isSelected && (
                          <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[var(--c-gray-900)] text-white flex items-center justify-center">
                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                              <path d="M2 5l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Notes */}
          {step === 'notes' && selectedImage && (
            <div>
              <div className="flex gap-4 mb-4">
                <div className="w-32 h-24 rounded-[var(--radius-sm)] overflow-hidden bg-[var(--c-gray-100)] shrink-0">
                  <img src={mediaUrl(folderName, selectedImage)} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1">
                  <p className="text-[13px] text-[var(--c-gray-600)] mb-2">
                    Add optional notes to guide the generation. Leave blank for automatic selection.
                  </p>
                  <p className="text-[10px] text-[var(--c-gray-400)]">
                    e.g., &quot;Use a corporate setting with a laptop&quot; or &quot;Urban context, person on a smartphone&quot;
                  </p>
                </div>
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional: describe the context, device, or framing you want..."
                rows={3}
                className="w-full text-[13px] px-4 py-3 bg-[var(--c-gray-50)] border border-[var(--c-gray-200)] rounded-[var(--radius-sm)] focus:outline-none focus:border-[var(--c-gray-400)] resize-none"
              />
              {error && (
                <p className="text-[11px] text-[var(--c-error)] mt-2">{error}</p>
              )}
            </div>
          )}

          {/* Step 3: Generating */}
          {step === 'generating' && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="w-8 h-8 border-2 border-[var(--c-gray-300)] border-t-[var(--c-gray-900)] rounded-full animate-spin" />
              <p className="text-[13px] text-[var(--c-gray-500)]">Generating two variants...</p>
              <p className="text-[10px] text-[var(--c-gray-400)]">This takes 15-30 seconds</p>
            </div>
          )}

          {/* Step 4: Results */}
          {step === 'results' && images.length > 0 && (
            <div>
              <p className="text-[13px] text-[var(--c-gray-600)] mb-4">
                Pick one to save to the project media{images.length === 1 ? '' : ', or regenerate for new variants'}.
              </p>
              <div className={`grid gap-4 ${images.length > 1 ? 'grid-cols-2' : 'grid-cols-1 max-w-[400px]'}`}>
                {images.map((img, i) => (
                  <div key={i} className="relative group">
                    <div className="aspect-[16/9] rounded-[var(--radius-sm)] overflow-hidden bg-[var(--c-gray-100)]">
                      <img
                        src={`data:${img.mimeType};base64,${img.data}`}
                        alt={`Variant ${i + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <button
                      onClick={() => handleAccept(i)}
                      disabled={saving}
                      className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[11px] font-[450] px-4 py-1.5 rounded-[var(--radius-sm)] bg-[var(--c-gray-900)] text-white hover:bg-[var(--c-gray-800)] transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Use this'}
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3 mt-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={setAsThumbnail}
                    onChange={(e) => setSetAsThumbnail(e.target.checked)}
                    className="w-3.5 h-3.5 rounded-[2px] border-[var(--c-gray-300)] cursor-pointer"
                  />
                  <span className="text-[11px] text-[var(--c-gray-500)]">Set as thumbnail</span>
                </label>
              </div>

              {error && (
                <p className="text-[11px] text-[var(--c-error)] mt-2">{error}</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--c-gray-100)]">
          <div>
            {step === 'results' && (
              <button
                onClick={() => { setStep('notes'); setImages([]) }}
                className="text-[12px] text-[var(--c-gray-500)] hover:text-[var(--c-gray-700)] transition-colors"
              >
                Regenerate
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button onClick={handleClose} className="text-[12px] text-[var(--c-gray-500)] hover:text-[var(--c-gray-700)] transition-colors px-3 py-1.5">
              Cancel
            </button>
            {step === 'pick-image' && (
              <button
                onClick={() => setStep('notes')}
                disabled={!selectedImage}
                className="text-[12px] font-[450] px-4 py-2 rounded-[var(--radius-sm)] bg-[var(--c-gray-900)] text-white hover:bg-[var(--c-gray-800)] transition-colors disabled:opacity-30"
              >
                Next
              </button>
            )}
            {step === 'notes' && (
              <button
                onClick={handleGenerate}
                className="text-[12px] font-[450] px-4 py-2 rounded-[var(--radius-sm)] bg-[var(--c-gray-900)] text-white hover:bg-[var(--c-gray-800)] transition-colors"
              >
                Generate
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
