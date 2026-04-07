'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api-client'
import { toast } from '@/lib/toast'
import { useProjectStore } from '@/stores/project-store'
import type { ProjectSummary } from '@/lib/types'

interface Suggestion {
  projectId: string
  relevance: string
  approved: boolean
  manual?: boolean
}

interface Props {
  open: boolean
  onClose: () => void
}

type Step = 'intro' | 'suggesting' | 'review' | 'building'

export function NewCollectionWizard({ open, onClose }: Props) {
  const router = useRouter()
  const { projects } = useProjectStore()

  const [step, setStep] = useState<Step>('intro')
  const [name, setName] = useState('')
  const [brief, setBrief] = useState('')
  const [busy, setBusy] = useState(false)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [pickerQuery, setPickerQuery] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)

  // Reset state when opened
  useEffect(() => {
    if (open) {
      setStep('intro')
      setName('')
      setBrief('')
      setSuggestions([])
      setBusy(false)
      setPickerQuery('')
      setPickerOpen(false)
    }
  }, [open])

  const projectMap = useMemo(() => {
    const m = new Map<string, ProjectSummary>()
    for (const p of projects) m.set(p.id, p)
    return m
  }, [projects])

  const filteredPicker = useMemo(() => {
    if (!pickerQuery.trim()) return projects.slice(0, 12)
    const q = pickerQuery.toLowerCase()
    return projects
      .filter(
        (p) =>
          p.client.toLowerCase().includes(q) ||
          p.projectName.toLowerCase().includes(q)
      )
      .slice(0, 12)
  }, [projects, pickerQuery])

  if (!open) return null

  async function handleCreateEmpty() {
    if (!name.trim()) return
    setBusy(true)
    try {
      const res = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })
      const data = await res.json()
      if (data.id) {
        router.push(`/collections/${data.id}`)
      } else {
        toast.error('Failed to create collection')
        setBusy(false)
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create collection')
      setBusy(false)
    }
  }

  async function handleSuggest() {
    if (!name.trim()) {
      toast.error('Give the collection a name first')
      return
    }
    if (!brief.trim()) {
      toast.error('Paste a brief so Claude knows what to look for')
      return
    }
    setStep('suggesting')
    try {
      const data = await api.aiSuggestCollection(brief.trim())
      if (!data.suggestions || data.suggestions.length === 0) {
        toast.error('Claude found no relevant projects — try a longer brief')
        setStep('intro')
        return
      }
      setSuggestions(
        data.suggestions.map((s) => ({
          projectId: s.projectId,
          relevance: s.relevance,
          approved: true,
        }))
      )
      setStep('review')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'AI suggestion failed')
      setStep('intro')
    }
  }

  function toggleApprove(id: string) {
    setSuggestions((prev) =>
      prev.map((s) => (s.projectId === id ? { ...s, approved: !s.approved } : s))
    )
  }

  function removeSuggestion(id: string) {
    setSuggestions((prev) => prev.filter((s) => s.projectId !== id))
  }

  async function addManualProject(p: ProjectSummary) {
    if (suggestions.some((s) => s.projectId === p.id)) {
      toast.error('Already in the list')
      return
    }
    // Optimistically add with a placeholder
    setSuggestions((prev) => [
      ...prev,
      { projectId: p.id, relevance: 'Generating relevance…', approved: true, manual: true },
    ])
    setPickerOpen(false)
    setPickerQuery('')
    try {
      const data = await api.aiCollectionRelevance(brief.trim(), p.id)
      setSuggestions((prev) =>
        prev.map((s) =>
          s.projectId === p.id ? { ...s, relevance: data.relevance } : s
        )
      )
    } catch (e) {
      toast.error('Could not generate relevance for that project')
      setSuggestions((prev) =>
        prev.map((s) =>
          s.projectId === p.id ? { ...s, relevance: '' } : s
        )
      )
    }
  }

  async function handleBuild() {
    const approved = suggestions.filter((s) => s.approved)
    if (approved.length === 0) {
      toast.error('Approve at least one project first')
      return
    }
    setStep('building')
    try {
      const data = await api.aiBuildCollection({
        name: name.trim(),
        brief: brief.trim(),
        projects: approved.map((s) => ({ id: s.projectId, relevance: s.relevance })),
      })
      if (data.collectionId) {
        router.push(`/collections/${data.collectionId}`)
      } else {
        toast.error('Failed to build collection')
        setStep('review')
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to build collection')
      setStep('review')
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy && step !== 'building' && step !== 'suggesting') onClose()
      }}
    >
      <div className="w-full max-w-[640px] max-h-[90vh] overflow-y-auto rounded-[var(--radius-md)] bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--c-gray-100)]">
          <h2 className="text-[15px] font-[450] text-[var(--c-gray-900)]">
            {step === 'intro' && 'New collection'}
            {step === 'suggesting' && 'Reading your archive'}
            {step === 'review' && 'Review suggestions'}
            {step === 'building' && 'Building collection'}
          </h2>
          <button
            onClick={onClose}
            disabled={busy || step === 'building' || step === 'suggesting'}
            className="text-[12px] text-[var(--c-gray-500)] hover:text-[var(--c-gray-900)] disabled:opacity-30"
          >
            Close
          </button>
        </div>

        {/* Step 1 — Intro */}
        {step === 'intro' && (
          <div className="px-6 py-5 flex flex-col gap-4">
            <div>
              <label className="block text-[11px] uppercase tracking-wide text-[var(--c-gray-500)] mb-1">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Climate dashboards for non-profits"
                className="w-full px-3 py-2 text-[13px] bg-transparent border-b border-[var(--c-gray-200)] focus:border-[var(--c-gray-900)] focus:outline-none"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-wide text-[var(--c-gray-500)] mb-1">
                Brief (optional — paste an RFP for AI matching)
              </label>
              <textarea
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                placeholder="Paste the client brief, RFP, or describe what you're pitching..."
                rows={6}
                className="w-full px-3 py-2 text-[13px] bg-transparent border border-[var(--c-gray-200)] rounded-[var(--radius-sm)] focus:border-[var(--c-gray-900)] focus:outline-none resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={handleCreateEmpty}
                disabled={!name.trim() || busy}
                className="text-[12px] font-[450] px-4 py-2 rounded-[var(--radius-sm)] border border-[var(--c-gray-200)] text-[var(--c-gray-700)] hover:bg-[var(--c-gray-50)] disabled:opacity-40"
              >
                Create empty
              </button>
              <button
                onClick={handleSuggest}
                disabled={!name.trim() || !brief.trim() || busy}
                className="text-[12px] font-[450] px-4 py-2 rounded-[var(--radius-sm)] bg-[var(--c-gray-900)] text-white hover:bg-[var(--c-gray-800)] disabled:opacity-40"
              >
                Suggest projects with AI
              </button>
            </div>
          </div>
        )}

        {/* Step 2a — Suggesting */}
        {step === 'suggesting' && (
          <div className="px-6 py-12 flex flex-col items-center justify-center gap-3">
            <div className="w-6 h-6 border-2 border-[var(--c-gray-200)] border-t-[var(--c-gray-900)] rounded-full animate-spin" />
            <p className="text-[13px] text-[var(--c-gray-600)]">Claude is reading your archive…</p>
            <p className="text-[11px] text-[var(--c-gray-400)]">This usually takes 10–20 seconds.</p>
          </div>
        )}

        {/* Step 2b — Review */}
        {step === 'review' && (
          <div className="px-6 py-5 flex flex-col gap-4">
            <p className="text-[12px] text-[var(--c-gray-500)]">
              Claude picked {suggestions.length} project{suggestions.length !== 1 ? 's' : ''}. Approve or skip each, then build.
            </p>

            <div className="flex flex-col gap-2">
              {suggestions.map((s) => {
                const p = projectMap.get(s.projectId)
                return (
                  <div
                    key={s.projectId}
                    className={`border rounded-[var(--radius-sm)] p-3 transition-colors ${
                      s.approved ? 'border-[var(--c-gray-300)] bg-white' : 'border-[var(--c-gray-100)] bg-[var(--c-gray-50)] opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-[450] text-[var(--c-gray-900)] truncate">
                          {p ? `${p.client} — ${p.projectName}` : s.projectId}
                        </p>
                        <p className="text-[12px] text-[var(--c-gray-600)] mt-1 leading-snug whitespace-pre-wrap">
                          {s.relevance}
                        </p>
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        <button
                          onClick={() => toggleApprove(s.projectId)}
                          className="text-[11px] px-2 py-1 rounded border border-[var(--c-gray-200)] hover:bg-[var(--c-gray-100)]"
                        >
                          {s.approved ? 'Skip' : 'Approve'}
                        </button>
                        <button
                          onClick={() => removeSuggestion(s.projectId)}
                          className="text-[11px] px-2 py-1 text-[var(--c-gray-400)] hover:text-[var(--c-gray-700)]"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Add manual project */}
            <div className="border-t border-[var(--c-gray-100)] pt-3">
              {!pickerOpen ? (
                <button
                  onClick={() => setPickerOpen(true)}
                  className="text-[12px] text-[var(--c-gray-600)] hover:text-[var(--c-gray-900)]"
                >
                  + Add another project
                </button>
              ) : (
                <div className="flex flex-col gap-2">
                  <input
                    type="text"
                    autoFocus
                    placeholder="Search projects..."
                    value={pickerQuery}
                    onChange={(e) => setPickerQuery(e.target.value)}
                    className="px-3 py-2 text-[12px] border border-[var(--c-gray-200)] rounded-[var(--radius-sm)] focus:border-[var(--c-gray-900)] focus:outline-none"
                  />
                  <div className="max-h-[180px] overflow-y-auto flex flex-col gap-1">
                    {filteredPicker.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => addManualProject(p)}
                        className="text-left px-2 py-1.5 text-[12px] hover:bg-[var(--c-gray-50)] rounded"
                      >
                        <span className="text-[var(--c-gray-900)]">{p.client}</span>{' '}
                        <span className="text-[var(--c-gray-500)]">— {p.projectName}</span>
                      </button>
                    ))}
                    {filteredPicker.length === 0 && (
                      <p className="text-[11px] text-[var(--c-gray-400)] px-2 py-2">No matches.</p>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setPickerOpen(false)
                      setPickerQuery('')
                    }}
                    className="text-[11px] text-[var(--c-gray-400)] hover:text-[var(--c-gray-700)] self-start"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setStep('intro')}
                className="text-[12px] font-[450] px-4 py-2 rounded-[var(--radius-sm)] border border-[var(--c-gray-200)] text-[var(--c-gray-700)] hover:bg-[var(--c-gray-50)]"
              >
                Back
              </button>
              <button
                onClick={handleBuild}
                disabled={suggestions.filter((s) => s.approved).length === 0}
                className="text-[12px] font-[450] px-4 py-2 rounded-[var(--radius-sm)] bg-[var(--c-gray-900)] text-white hover:bg-[var(--c-gray-800)] disabled:opacity-40"
              >
                Build collection
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — Building */}
        {step === 'building' && (
          <div className="px-6 py-12 flex flex-col items-center justify-center gap-3">
            <div className="w-6 h-6 border-2 border-[var(--c-gray-200)] border-t-[var(--c-gray-900)] rounded-full animate-spin" />
            <p className="text-[13px] text-[var(--c-gray-600)]">Building collection…</p>
            <p className="text-[11px] text-[var(--c-gray-400)]">Grouping projects into sections.</p>
          </div>
        )}
      </div>
    </div>
  )
}
