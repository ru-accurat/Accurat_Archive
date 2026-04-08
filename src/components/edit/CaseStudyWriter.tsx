'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { toast } from '@/lib/toast'
import { api } from '@/lib/api-client'
import { useProjectStore } from '@/stores/project-store'
import type { CaseStudyDraft } from '@/lib/types'

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
  onAccept: (fields: Record<string, unknown>) => void
}

type Quality = 'fast' | 'premium'

const FIELD_LABELS: Record<string, string> = {
  tagline: 'Tagline',
  description: 'Description',
  challenge: 'Challenge',
  solution: 'Solution',
  deliverables: 'Deliverables',
}

// Simple word-level diff (LCS)
function computeWordDiff(oldText: string, newText: string): { type: 'same' | 'added' | 'removed'; text: string }[] {
  const oldWords = oldText.split(/(\s+)/)
  const newWords = newText.split(/(\s+)/)
  const m = oldWords.length
  const n = newWords.length

  if (m * n > 50000) {
    const result: { type: 'same' | 'added' | 'removed'; text: string }[] = []
    if (oldText) result.push({ type: 'removed', text: oldText })
    if (newText) result.push({ type: 'added', text: newText })
    return result
  }

  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldWords[i - 1] === newWords[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1
      else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
    }
  }

  let i = m, j = n
  const ops: { type: 'same' | 'added' | 'removed'; text: string }[] = []
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldWords[i - 1] === newWords[j - 1]) {
      ops.push({ type: 'same', text: oldWords[i - 1] })
      i--; j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      ops.push({ type: 'added', text: newWords[j - 1] })
      j--
    } else {
      ops.push({ type: 'removed', text: oldWords[i - 1] })
      i--
    }
  }
  ops.reverse()

  const result: { type: 'same' | 'added' | 'removed'; text: string }[] = []
  for (const op of ops) {
    if (result.length > 0 && result[result.length - 1].type === op.type) {
      result[result.length - 1].text += op.text
    } else {
      result.push({ ...op })
    }
  }
  return result
}

function DiffView({ oldText, newText }: { oldText: string; newText: string }) {
  const diff = useMemo(() => computeWordDiff(oldText || '', newText || ''), [oldText, newText])
  if (!oldText) {
    return <div className="text-[12px] text-[var(--c-gray-800)] leading-relaxed">{newText}</div>
  }
  return (
    <div className="text-[12px] leading-relaxed">
      {diff.map((part, i) => {
        if (part.type === 'removed') return <span key={i} className="bg-red-100 text-red-700 line-through">{part.text}</span>
        if (part.type === 'added') return <span key={i} className="bg-green-100 text-green-800">{part.text}</span>
        return <span key={i} className="text-[var(--c-gray-700)]">{part.text}</span>
      })}
    </div>
  )
}

export function CaseStudyWriter({ open, projectId, currentValues, onClose, onAccept }: CaseStudyWriterProps) {
  const allProjects = useProjectStore((s) => s.projects)

  const [notes, setNotes] = useState('')
  const [quality, setQuality] = useState<Quality>('fast')
  const [loading, setLoading] = useState(false)
  const [generated, setGenerated] = useState<Record<string, string> | null>(null)
  const [generatedLocation, setGeneratedLocation] = useState<{ locationName?: string; latitude?: number; longitude?: number } | null>(null)
  const [accepted, setAccepted] = useState<Set<string>>(new Set())
  const [tokensUsed, setTokensUsed] = useState<number | null>(null)

  // Drafts
  const [drafts, setDrafts] = useState<CaseStudyDraft[]>([])

  // Reference project picker
  const [referenceProjectId, setReferenceProjectId] = useState<string | null>(null)
  const [refSearch, setRefSearch] = useState('')
  const [refDropdownOpen, setRefDropdownOpen] = useState(false)

  // Drawer mount/animation state
  const [mounted, setMounted] = useState(false)
  const [shown, setShown] = useState(false)

  const hasExistingContent = !!(currentValues.description || currentValues.challenge || currentValues.solution || currentValues.tagline)

  // Mount/unmount with transition
  useEffect(() => {
    if (open) {
      setMounted(true)
      const t = setTimeout(() => setShown(true), 10)
      return () => clearTimeout(t)
    } else {
      setShown(false)
      const t = setTimeout(() => setMounted(false), 250)
      return () => clearTimeout(t)
    }
  }, [open])

  // Load drafts when drawer opens
  useEffect(() => {
    if (!open || !projectId) return
    let cancelled = false
    api.getCaseStudyDrafts(projectId)
      .then((d) => { if (!cancelled) setDrafts(d) })
      .catch(() => { /* silent */ })
    return () => { cancelled = true }
  }, [open, projectId])

  const referenceProject = useMemo(() => {
    if (!referenceProjectId) return null
    return allProjects.find(p => p.id === referenceProjectId) || null
  }, [referenceProjectId, allProjects])

  const refSearchResults = useMemo(() => {
    if (!refSearch.trim()) return []
    const q = refSearch.toLowerCase()
    return allProjects
      .filter(p => p.id !== projectId && (
        p.client.toLowerCase().includes(q) ||
        p.projectName.toLowerCase().includes(q) ||
        (p.fullName && p.fullName.toLowerCase().includes(q))
      ))
      .slice(0, 8)
  }, [allProjects, refSearch, projectId])

  const handleGenerate = useCallback(async () => {
    setLoading(true)
    setGenerated(null)
    setAccepted(new Set())
    try {
      const data = await api.generateCaseStudy(projectId, {
        notes: notes || undefined,
        quality,
        referenceProjectId: referenceProjectId || undefined,
      })
      if (data.success && data.fields) {
        setGenerated(data.fields)
        setGeneratedLocation(data.location && Object.keys(data.location).length > 0 ? data.location : null)
        setTokensUsed(data.tokensUsed || null)
        // Persist as a draft
        try {
          const newDraft = await api.createCaseStudyDraft({
            projectId,
            notes,
            fields: data.fields,
            quality,
            referenceProjectId: referenceProjectId || null,
            isIterative: !!data.isIterative,
            tokensUsed: data.tokensUsed ?? null,
          })
          setDrafts(prev => [newDraft, ...prev])
        } catch {
          // non-fatal
        }
      } else {
        toast.error(data.message || 'Generation failed')
      }
    } catch (err) {
      toast.error('Generation failed: ' + String(err))
    }
    setLoading(false)
  }, [projectId, notes, quality, referenceProjectId])

  const handleAcceptAll = useCallback(() => {
    if (!generated) return
    const payload: Record<string, unknown> = { ...generated }
    if (generatedLocation) {
      if (generatedLocation.locationName) payload.locationName = generatedLocation.locationName
      if (generatedLocation.latitude !== undefined) payload.latitude = generatedLocation.latitude
      if (generatedLocation.longitude !== undefined) payload.longitude = generatedLocation.longitude
    }
    onAccept(payload)
    onClose()
  }, [generated, generatedLocation, onAccept, onClose])

  const handleAcceptField = useCallback((field: string) => {
    if (!generated?.[field]) return
    setAccepted(prev => new Set(prev).add(field))
    onAccept({ [field]: generated[field] })
  }, [generated, onAccept])

  const handleLoadDraft = useCallback((draft: CaseStudyDraft) => {
    setNotes(draft.notes || '')
    setQuality((draft.quality as Quality) || 'fast')
    setReferenceProjectId(draft.referenceProjectId || null)
    setGenerated(draft.fields || null)
    setAccepted(new Set())
    setTokensUsed(draft.tokensUsed ?? null)
  }, [])

  const handleDeleteDraft = useCallback(async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await api.deleteCaseStudyDraft(id)
      setDrafts(prev => prev.filter(d => d.id !== id))
      toast.success('Draft deleted')
    } catch {
      toast.error('Failed to delete draft')
    }
  }, [])

  if (!mounted) return null

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ${shown ? 'opacity-100' : 'opacity-0'}`}
      />
      {/* Drawer */}
      <div
        className={`absolute top-0 right-0 bottom-0 bg-[var(--c-white)] shadow-2xl flex flex-col w-full md:w-[60vw] md:max-w-[720px] transform transition-transform duration-250 ease-out ${shown ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ transitionDuration: '250ms' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--c-gray-100)] shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-[16px] font-[450] text-[var(--c-gray-900)]">
              {hasExistingContent && notes ? 'Refine Case Study' : 'Write Case Study'}
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--c-ai)]/10 text-[var(--c-ai)]">AI</span>
          </div>
          <button onClick={onClose} className="text-[var(--c-gray-400)] hover:text-[var(--c-gray-700)]">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Recent drafts */}
          {drafts.length > 0 && (
            <div className="mb-5">
              <div className="text-[10px] font-[500] uppercase tracking-[0.08em] text-[var(--c-gray-500)] mb-2">
                Recent drafts
              </div>
              <div className="flex flex-col gap-1.5">
                {drafts.slice(0, 6).map(d => {
                  const date = new Date(d.createdAt)
                  const dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' +
                    date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
                  const preview = (d.fields?.tagline || d.fields?.description || d.notes || '').slice(0, 80)
                  return (
                    <button
                      key={d.id}
                      onClick={() => handleLoadDraft(d)}
                      className="group flex items-start gap-2 px-3 py-2 rounded-[var(--radius-sm)] bg-[var(--c-gray-50)] hover:bg-[var(--c-gray-100)] transition-colors text-left"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[10px] text-[var(--c-gray-500)]">{dateStr}</span>
                          <span className="text-[9px] uppercase tracking-[0.08em] text-[var(--c-gray-400)]">{d.quality}</span>
                          {d.isIterative && (
                            <span className="text-[9px] uppercase tracking-[0.08em] text-[var(--c-ai)]">refined</span>
                          )}
                        </div>
                        <div className="text-[11px] text-[var(--c-gray-700)] truncate">{preview || '(empty)'}</div>
                      </div>
                      <span
                        onClick={(e) => handleDeleteDraft(d.id, e)}
                        className="text-[var(--c-gray-300)] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 cursor-pointer"
                        aria-label="Delete draft"
                      >
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {!generated ? (
            <div>
              <p className="text-[13px] text-[var(--c-gray-600)] mb-4">
                {hasExistingContent
                  ? 'Add feedback, corrections, or new information to refine the existing case study. The AI will integrate your input and restructure as needed.'
                  : 'Paste rough notes, bullet points, or context about this project. Italian is fine — the AI will write polished English following Accurat\'s voice guidelines.'
                }
              </p>

              {/* Reference project picker */}
              <div className="mb-4">
                <label className="text-[10px] font-[500] uppercase tracking-[0.08em] text-[var(--c-gray-500)] block mb-1.5">
                  Reference project (optional style anchor)
                </label>
                {referenceProject ? (
                  <div className="flex items-center gap-2 px-3 py-2 bg-[var(--c-gray-50)] border border-[var(--c-gray-200)] rounded-[var(--radius-sm)]">
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-[500] text-[var(--c-gray-800)] truncate">{referenceProject.client}</div>
                      <div className="text-[11px] text-[var(--c-gray-500)] truncate">{referenceProject.projectName}</div>
                    </div>
                    <button
                      onClick={() => { setReferenceProjectId(null); setRefSearch('') }}
                      className="text-[10px] text-[var(--c-gray-500)] hover:text-[var(--c-gray-900)] px-2"
                    >
                      Clear
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="text"
                      value={refSearch}
                      onChange={(e) => { setRefSearch(e.target.value); setRefDropdownOpen(true) }}
                      onFocus={() => setRefDropdownOpen(true)}
                      onBlur={() => setTimeout(() => setRefDropdownOpen(false), 150)}
                      placeholder="Search a project to use as a style reference..."
                      className="w-full text-[12px] px-3 py-2 bg-[var(--c-gray-50)] border border-[var(--c-gray-200)] rounded-[var(--radius-sm)] focus:outline-none focus:border-[var(--c-gray-400)]"
                    />
                    {refDropdownOpen && refSearchResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[var(--c-gray-200)] rounded-[var(--radius-sm)] shadow-lg max-h-[240px] overflow-y-auto z-10">
                        {refSearchResults.map(p => (
                          <button
                            key={p.id}
                            onMouseDown={(e) => {
                              e.preventDefault()
                              setReferenceProjectId(p.id)
                              setRefSearch('')
                              setRefDropdownOpen(false)
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-[var(--c-gray-50)] transition-colors"
                          >
                            <div className="text-[12px] font-[500] text-[var(--c-gray-800)] truncate">{p.client}</div>
                            <div className="text-[11px] text-[var(--c-gray-500)] truncate">{p.projectName}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={hasExistingContent
                  ? 'e.g., "Add that we also built a mobile version. The challenge should emphasize the tight deadline..."'
                  : 'e.g., Dashboard interattiva per il team marketing di LVMH. Doveva visualizzare i dati di lancio prodotto in tempo reale su 75 brand...'
                }
                rows={8}
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
              {Object.entries(FIELD_LABELS).map(([field, label]) => {
                const gen = generated[field]
                const current = currentValues[field as keyof typeof currentValues] || ''
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
                    <div className="bg-[var(--c-gray-50)] rounded-[var(--radius-sm)] p-3">
                      {current ? (
                        <DiffView oldText={current} newText={gen} />
                      ) : (
                        <div className="text-[12px] text-[var(--c-gray-800)] leading-relaxed bg-green-50 border border-green-100 rounded-[var(--radius-sm)] p-3 -m-3">
                          <span className="text-[9px] uppercase tracking-[0.1em] text-green-600 block mb-1">New</span>
                          {gen}
                        </div>
                      )}
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
        <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--c-gray-100)] shrink-0">
          <div className="flex gap-3">
            {generated && (
              <>
                <button
                  onClick={() => { setGenerated(null); setAccepted(new Set()) }}
                  className="text-[12px] text-[var(--c-gray-500)] hover:text-[var(--c-gray-700)] transition-colors"
                >
                  Add feedback
                </button>
                <button
                  onClick={() => { setGenerated(null); setAccepted(new Set()) }}
                  className="text-[12px] text-[var(--c-gray-500)] hover:text-[var(--c-gray-700)] transition-colors"
                >
                  Regenerate
                </button>
              </>
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
                {loading ? 'Generating...' : hasExistingContent ? 'Refine' : 'Generate'}
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
