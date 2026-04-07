'use client'

import { useState, useCallback, useMemo } from 'react'
import type { MediaFile } from '@/lib/types'
import { mediaUrl } from '@/lib/media-url'
import { toast } from '@/lib/toast'
import {
  DEVICES,
  PRINT_KEYS,
  SURFACES,
  FRAMINGS,
  ENVIRONMENT_PRESETS,
  type FramingKey,
} from '@/components/edit/in-use-options'

interface InUseGeneratorProps {
  open: boolean
  projectId: string
  folderName: string
  media: MediaFile[]
  onClose: () => void
  onImageSaved: (filename: string, setAsThumbnail: boolean) => void
}

type Step = 'pick-image' | 'configure' | 'generating' | 'results'

interface GeneratedImage {
  data: string
  mimeType: string
}

const DEFAULT_ENV_KEY = 'modern_corporate_office'

export function InUseGenerator({ open, projectId, folderName, media, onClose, onImageSaved }: InUseGeneratorProps) {
  const [step, setStep] = useState<Step>('pick-image')
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  // Form state
  const [device, setDevice] = useState<string>('laptop')
  const [surface, setSurface] = useState<string>(SURFACES[0].key)
  const [includeHuman, setIncludeHuman] = useState<boolean>(true)
  const [framing, setFraming] = useState<FramingKey>('hands_only')
  const [envPresetKey, setEnvPresetKey] = useState<string>(DEFAULT_ENV_KEY)
  const [envCustom, setEnvCustom] = useState<string>('')

  const [images, setImages] = useState<GeneratedImage[]>([])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [setAsThumbnail, setSetAsThumbnail] = useState(false)

  const digitalDevices = useMemo(() => DEVICES.filter((d) => d.kind === 'digital'), [])
  const printDevices = useMemo(() => DEVICES.filter((d) => d.kind === 'print'), [])
  const isPrint = PRINT_KEYS.has(device)

  const reset = useCallback(() => {
    setStep('pick-image')
    setSelectedImage(null)
    setDevice('laptop')
    setSurface(SURFACES[0].key)
    setIncludeHuman(true)
    setFraming('hands_only')
    setEnvPresetKey(DEFAULT_ENV_KEY)
    setEnvCustom('')
    setImages([])
    setError(null)
    setSaving(false)
    setSetAsThumbnail(false)
  }, [])

  const handleClose = useCallback(() => {
    reset()
    onClose()
  }, [reset, onClose])

  const resolvedEnvironment = useCallback((): string => {
    if (envPresetKey === 'custom') return envCustom.trim()
    const preset = ENVIRONMENT_PRESETS.find((p) => p.key === envPresetKey)
    const base = preset?.description?.trim() || ''
    const extra = envCustom.trim()
    return extra ? `${base} ${extra}` : base
  }, [envPresetKey, envCustom])

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
          device,
          surface: isPrint ? surface : undefined,
          includeHuman,
          framing: includeHuman ? framing : undefined,
          environment: resolvedEnvironment(),
        }),
      })
      const data = await res.json()
      if (data.success && data.images?.length > 0) {
        setImages(data.images)
        setStep('results')
      } else {
        const msg = data.error || 'Generation failed'
        setError(msg)
        toast.error(msg)
        setStep('configure')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
      toast.error(msg)
      setStep('configure')
    }
  }, [projectId, selectedImage, device, surface, isPrint, includeHuman, framing, resolvedEnvironment])

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
        toast.success('Image saved to project media')
        onImageSaved(data.filename, !!setAsThumbnail)
        handleClose()
      } else {
        const msg = data.error || 'Save failed'
        setError(msg)
        toast.error(msg)
        setSaving(false)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
      toast.error(msg)
      setSaving(false)
    }
  }, [images, projectId, setAsThumbnail, onImageSaved, handleClose])

  if (!open) return null

  const imageMedia = media.filter((m) => {
    const ext = m.filename.toLowerCase()
    return ext.endsWith('.png') || ext.endsWith('.jpg') || ext.endsWith('.jpeg') || ext.endsWith('.webp')
  })

  const selectClass =
    'w-full text-[13px] px-3 py-2 bg-[var(--c-gray-50)] border border-[var(--c-gray-200)] rounded-[var(--radius-sm)] focus:outline-none focus:border-[var(--c-gray-400)]'
  const labelClass = 'block text-[11px] font-[450] text-[var(--c-gray-600)] mb-1.5'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-[var(--c-white)] rounded-[var(--radius-md)] shadow-xl w-[90vw] max-w-[800px] max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--c-gray-100)]">
          <div className="flex items-center gap-3">
            <h2 className="text-[16px] font-[450] text-[var(--c-gray-900)]">Generate In-Use Image</h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--c-ai)]/10 text-[var(--c-ai)]">Gemini</span>
          </div>
          <button onClick={handleClose} className="text-[var(--c-gray-400)] hover:text-[var(--c-gray-700)]">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Step 1: Pick source image */}
          {step === 'pick-image' && (
            <div>
              <p className="text-[13px] text-[var(--c-gray-600)] mb-4">
                Select a source screenshot. It will be composited onto the chosen device or print medium.
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
                          isSelected
                            ? 'border-[var(--c-gray-900)] ring-2 ring-[var(--c-gray-900)]/20'
                            : 'border-transparent hover:border-[var(--c-gray-300)]'
                        }`}
                      >
                        <img src={url} alt={m.filename} className="w-full h-full object-cover" />
                        {isSelected && (
                          <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[var(--c-gray-900)] text-white flex items-center justify-center">
                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                              <path
                                d="M2 5l2 2 4-4"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
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

          {/* Step 2: Configure */}
          {step === 'configure' && selectedImage && (
            <div>
              <div className="flex gap-4 mb-5">
                <div className="w-32 h-24 rounded-[var(--radius-sm)] overflow-hidden bg-[var(--c-gray-100)] shrink-0">
                  <img src={mediaUrl(folderName, selectedImage)} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1">
                  <p className="text-[13px] text-[var(--c-gray-600)]">
                    Configure the device, framing, and environment. Style, lighting, and aspect ratio come from the universal template in Settings.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Device */}
                <div>
                  <label className={labelClass}>Device / medium</label>
                  <select value={device} onChange={(e) => setDevice(e.target.value)} className={selectClass}>
                    <optgroup label="Digital">
                      {digitalDevices.map((d) => (
                        <option key={d.key} value={d.key}>{d.label}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Print">
                      {printDevices.map((d) => (
                        <option key={d.key} value={d.key}>{d.label}</option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                {/* Surface (print only) */}
                {isPrint && (
                  <div>
                    <label className={labelClass}>Surface / placement</label>
                    <select value={surface} onChange={(e) => setSurface(e.target.value)} className={selectClass}>
                      {SURFACES.map((s) => (
                        <option key={s.key} value={s.key}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Include person toggle */}
                <div className={isPrint ? 'col-span-2' : ''}>
                  <label className={labelClass}>People</label>
                  <label className="flex items-center gap-2 cursor-pointer text-[13px] text-[var(--c-gray-700)] py-2">
                    <input
                      type="checkbox"
                      checked={includeHuman}
                      onChange={(e) => setIncludeHuman(e.target.checked)}
                      className="w-3.5 h-3.5 rounded-[2px] border-[var(--c-gray-300)] cursor-pointer"
                    />
                    Include a person interacting with the device
                  </label>
                </div>

                {/* Framing */}
                {includeHuman && (
                  <div className="col-span-2">
                    <label className={labelClass}>Framing</label>
                    <select
                      value={framing}
                      onChange={(e) => setFraming(e.target.value as FramingKey)}
                      className={selectClass}
                    >
                      {FRAMINGS.map((f) => (
                        <option key={f.key} value={f.key}>{f.label}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Environment preset */}
                <div className="col-span-2">
                  <label className={labelClass}>Environment preset</label>
                  <select
                    value={envPresetKey}
                    onChange={(e) => setEnvPresetKey(e.target.value)}
                    className={selectClass}
                  >
                    {ENVIRONMENT_PRESETS.map((p) => (
                      <option key={p.key} value={p.key}>{p.label}</option>
                    ))}
                  </select>
                </div>

                {/* Environment custom / extras */}
                <div className="col-span-2">
                  <label className={labelClass}>
                    {envPresetKey === 'custom' ? 'Custom environment description' : 'Extra details (optional)'}
                  </label>
                  <textarea
                    value={envCustom}
                    onChange={(e) => setEnvCustom(e.target.value)}
                    placeholder={
                      envPresetKey === 'custom'
                        ? 'Describe the scene in detail...'
                        : 'Add extra context to append to the preset...'
                    }
                    rows={2}
                    className={`${selectClass} resize-none`}
                  />
                </div>
              </div>

              {error && <p className="text-[11px] text-[var(--c-error)] mt-3">{error}</p>}
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

              {error && <p className="text-[11px] text-[var(--c-error)] mt-2">{error}</p>}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--c-gray-100)]">
          <div>
            {step === 'results' && (
              <button
                onClick={handleGenerate}
                className="text-[12px] text-[var(--c-gray-500)] hover:text-[var(--c-gray-700)] transition-colors"
              >
                Regenerate
              </button>
            )}
            {step === 'configure' && (
              <button
                onClick={() => setStep('pick-image')}
                className="text-[12px] text-[var(--c-gray-500)] hover:text-[var(--c-gray-700)] transition-colors"
              >
                Back
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleClose}
              className="text-[12px] text-[var(--c-gray-500)] hover:text-[var(--c-gray-700)] transition-colors px-3 py-1.5"
            >
              Cancel
            </button>
            {step === 'pick-image' && (
              <button
                onClick={() => setStep('configure')}
                disabled={!selectedImage}
                className="text-[12px] font-[450] px-4 py-2 rounded-[var(--radius-sm)] bg-[var(--c-gray-900)] text-white hover:bg-[var(--c-gray-800)] transition-colors disabled:opacity-30"
              >
                Next
              </button>
            )}
            {step === 'configure' && (
              <button
                onClick={handleGenerate}
                disabled={envPresetKey === 'custom' && !envCustom.trim()}
                className="text-[12px] font-[450] px-4 py-2 rounded-[var(--radius-sm)] bg-[var(--c-gray-900)] text-white hover:bg-[var(--c-gray-800)] transition-colors disabled:opacity-30"
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
