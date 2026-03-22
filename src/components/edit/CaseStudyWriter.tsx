'use client'

import { useState, useCallback } from 'react'

interface CaseStudyWriterProps {
  open: boolean
  projectId: string
  currentValues: {
    tagline?: string
    description?: string
    challenge?: string
    solution?: string
    deliverables?: string
  }
  onClose: () => void
  onAccept: (fields: Record<string, string>) => void
}

type Quality = 'fast' | 'premium'

const FIELD_LABELS: Record<string, string> = {
  tagline: 'Tagline',
  description: 'Description',
  challenge: 'Challenge',
  solution: 'Solution',
  deliverables: 'Deliverables',
}

export function CaseStudyWriter({ open, projectId, currentValues, onClose, onAccept }: CaseStudyWriterProps) {
  const [notes, setNotes] = useState('')
  const [quality, setQuality] = useState<Quality>('fast')
  const [loading, setLoading] = useState(false)
  const [generated, setGenerated] = useState<Record<string, string> | null>(null)
  const [accepted, setAccepted] = useState<Set<string>>(new Set())
  const [tokensUsed, setTokensUsed] = useState<number | null>(null)

  const handleGenerate = useCallback(async () => {
    setLoading(true)
    setGenerated(null)
    setAccepted(new Set())
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          mode: 'full',
          notes: notes || undefined,
          quality,
        }),
      })
      const data = await res.json()
      if (data.success && data.fields) {
        setGenerated(data.fields)
        setTokensUsed(data.tokensUsed || null)
      } else {
        alert(data.message || 'Generation failed')
      }
    } catch (err) {
      alert('Failed: ' + String(err))
    }
    setLoading(false)
  }, [projectId, notes, quality])

  const handleAcceptAll = useCallback(() => {
    if (!generated) return
    onAccept(generated)
    onClose()
  }, [generated, onAccept, onClose])

  const handleAcceptField = useCallback((field: string) => {
    if (!generated?.[field]) return
    setAccepted(prev => new Set(prev).add(field))
    onAccept({ [field]: generated[field] })
  }, [generated, onAccept])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-[var(--c-white)] rounded-[var(--radius-md)] shadow-xl w-[90vw] max-w-[900px] max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--c-gray-100)]">
          <div className="flex items-center gap-3">
            <h2 className="text-[16px] font-[450] text-[var(--c-gray-900)]">Write Case Study</h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--c-ai)]/10 text-[var(--c-ai)]">AI</span>
          </div>
          <button onClick={onClose} className="text-[var(--c-gray-400)] hover:text-[var(--c-gray-700)]">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {!generated ? (
            <div>
              <p className="text-[13px] text-[var(--c-gray-600)] mb-4">
                Paste rough notes, bullet points, or context about this project. Italian is fine — the AI will write polished English following Accurat's voice guidelines.
              </p>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g., Dashboard interattiva per il team marketing di LVMH. Doveva visualizzare i dati di lancio prodotto in tempo reale su 75 brand. Abbiamo usato D3.js e un backend personalizzato..."
                rows={6}
                className="w-full text-[13px] px-4 py-3 bg-[var(--c-gray-50)] border border-[var(--c-gray-200)] rounded-[var(--radius-sm)] focus:outline-none focus:border-[var(--c-gray-400)] resize-none"
              />

              <div className="flex items-center gap-4 mt-4">
                <div className="flex gap-1">
                  <button
                    onClick={() => setQuality('fast')}
                    className={`text-[11px] font-[450] px-3 py-1.5 rounded-[var(--radius-sm)] transition-colors ${
                      quality === 'fast' ? 'bg-[var(--c-gray-900)] text-white' : 'text-[var(--c-gray-500)] hover:bg-[var(--c-gray-50)]'
                    }`}
                  >
                    Quick draft
                  </button>
                  <button
                    onClick={() => setQuality('premium')}
                    className={`text-[11px] font-[450] px-3 py-1.5 rounded-[var(--radius-sm)] transition-colors ${
                      quality === 'premium' ? 'bg-[var(--c-gray-900)] text-white' : 'text-[var(--c-gray-500)] hover:bg-[var(--c-gray-50)]'
                    }`}
                  >
                    Premium
                  </button>
                </div>
                <span className="text-[10px] text-[var(--c-gray-400)]">
                  {quality === 'fast' ? 'Sonnet · ~$0.01' : 'Opus · ~$0.10'}
                </span>
              </div>
            </div>
          ) : (
            <div>
              {/* Generated fields with current comparison */}
              {Object.entries(FIELD_LABELS).map(([field, label]) => {
                const gen = generated[field]
                const current = currentValues[field as keyof typeof currentValues]
                const isAccepted = accepted.has(field)
                if (!gen) return null
                return (
                  <div key={field} className="mb-5">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-[500] uppercase tracking-[0.08em] text-[var(--c-gray-500)]">{label}</span>
                      <button
                        onClick={() => handleAcceptField(field)}
                        disabled={isAccepted}
                        className={`text-[10px] font-[450] px-2.5 py-1 rounded-[var(--radius-sm)] transition-colors ${
                          isAccepted
                            ? 'bg-green-100 text-green-700'
                            : 'bg-[var(--c-gray-900)] text-white hover:bg-[var(--c-gray-800)]'
                        }`}
                      >
                        {isAccepted ? 'Accepted' : 'Accept'}
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {current && (
                        <div className="text-[12px] text-[var(--c-gray-500)] bg-[var(--c-gray-50)] rounded-[var(--radius-sm)] p-3">
                          <span className="text-[9px] uppercase tracking-[0.1em] text-[var(--c-gray-400)] block mb-1">Current</span>
                          {current}
                        </div>
                      )}
                      <div className={`text-[12px] text-[var(--c-gray-800)] bg-green-50 border border-green-100 rounded-[var(--radius-sm)] p-3 ${!current ? 'col-span-2' : ''}`}>
                        <span className="text-[9px] uppercase tracking-[0.1em] text-green-600 block mb-1">Generated</span>
                        {gen}
                      </div>
                    </div>
                  </div>
                )
              })}

              {tokensUsed && (
                <p className="text-[10px] text-[var(--c-gray-400)] mt-2">
                  {tokensUsed.toLocaleString()} tokens used
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--c-gray-100)]">
          <div>
            {generated && (
              <button
                onClick={() => { setGenerated(null); setAccepted(new Set()) }}
                className="text-[12px] text-[var(--c-gray-500)] hover:text-[var(--c-gray-700)] transition-colors"
              >
                Regenerate
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="text-[12px] text-[var(--c-gray-500)] hover:text-[var(--c-gray-700)] transition-colors px-3 py-1.5">
              {generated ? 'Close' : 'Cancel'}
            </button>
            {!generated ? (
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="text-[12px] font-[450] px-4 py-2 rounded-[var(--radius-sm)] bg-[var(--c-gray-900)] text-white hover:bg-[var(--c-gray-800)] transition-colors disabled:opacity-50"
              >
                {loading ? 'Generating...' : 'Generate'}
              </button>
            ) : (
              <button
                onClick={handleAcceptAll}
                className="text-[12px] font-[450] px-4 py-2 rounded-[var(--radius-sm)] bg-[var(--c-gray-900)] text-white hover:bg-[var(--c-gray-800)] transition-colors"
              >
                Accept All
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
