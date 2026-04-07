'use client'

import { useEffect, useState } from 'react'

const STORAGE_KEY = 'accurat-tour-completed-v1'

interface TourStep {
  title: string
  body: string
}

const STEPS: TourStep[] = [
  {
    title: 'Welcome to Accurat Archive',
    body: "This is where all our projects live. Let's take a quick tour — it takes about 30 seconds.",
  },
  {
    title: 'Search and filter',
    body: 'Use the search bar and filter chips at the top of the projects list to find any project by name, client, tag, year, or status.',
  },
  {
    title: 'Open a project',
    body: 'Click any project card to see its full details — description, images, tags, client, and engagement.',
  },
  {
    title: 'Collections for pitching',
    body: "Group projects into Collections to build custom decks for new-business pitches. Export them as PPTX when you're ready.",
  },
  {
    title: 'Edit anytime',
    body: 'Every field in the app is editable inline. Changes save automatically as you type — no Save button needed.',
  },
  {
    title: 'Tip: press ⌘K',
    body: 'Hit ⌘K (or Ctrl+K) anywhere to open the command palette and jump to any page or action. Happy archiving!',
  },
]

export function ProductTour() {
  const [mounted, setMounted] = useState(false)
  const [step, setStep] = useState(0)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setMounted(true)
    try {
      const done = localStorage.getItem(STORAGE_KEY)
      if (!done) setVisible(true)
    } catch {}
  }, [])

  useEffect(() => {
    if (!visible) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') complete()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  const complete = () => {
    try {
      localStorage.setItem(STORAGE_KEY, new Date().toISOString())
    } catch {}
    setVisible(false)
  }

  const next = () => {
    if (step < STEPS.length - 1) setStep(step + 1)
    else complete()
  }

  if (!mounted || !visible) return null

  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center sm:justify-end p-4 sm:p-6 pointer-events-none">
      <div className="absolute inset-0 bg-black/40 pointer-events-auto" onClick={complete} />
      <div className="relative pointer-events-auto w-full max-w-[360px] bg-[var(--c-gray-900)] border border-white/10 rounded-[var(--radius-md)] shadow-2xl p-4 sm:p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[9px] font-[500] tracking-[0.1em] uppercase text-white/30">
            Step {step + 1} of {STEPS.length}
          </span>
          <button
            onClick={complete}
            className="text-[10px] text-white/40 hover:text-white/70 transition-colors"
          >
            Skip tour
          </button>
        </div>
        <h3 className="text-[14px] font-[500] text-white/90 mb-1.5">{current.title}</h3>
        <p className="text-[12px] leading-relaxed text-white/60 mb-4">{current.body}</p>
        <div className="flex items-center gap-1 mb-4">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= step ? 'bg-white/70' : 'bg-white/10'
              }`}
            />
          ))}
        </div>
        <div className="flex items-center justify-between">
          <button
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0}
            className="text-[11px] text-white/40 hover:text-white/70 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Back
          </button>
          <button
            onClick={next}
            className="px-3 py-1.5 bg-white text-black text-[11px] font-[500] rounded-[var(--radius-sm)] hover:bg-white/90 transition-colors"
          >
            {isLast ? 'Get started' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )
}
