'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from '@/lib/toast'

interface Props {
  description: string
  currentDomains: string[]
  currentServices: string[]
  currentOutput: string
  availableDomains?: string[]
  availableServices?: string[]
  onAddDomain: (tag: string) => void
  onAddService: (tag: string) => void
  onSetOutput: (value: string) => void
  dark?: boolean
}

interface Suggestions {
  domains: string[]
  services: string[]
  output?: string
}

const MIN_LENGTH = 40

export function SuggestedTags({
  description,
  currentDomains,
  currentServices,
  currentOutput,
  availableDomains = [],
  availableServices = [],
  onAddDomain,
  onAddService,
  onSetOutput,
  dark = false,
}: Props) {
  const [suggestions, setSuggestions] = useState<Suggestions>({ domains: [], services: [] })
  const [loading, setLoading] = useState(false)
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const abortRef = useRef<AbortController | null>(null)

  const desc = description.trim()
  const tooShort = desc.length < MIN_LENGTH

  useEffect(() => {
    if (tooShort) {
      setSuggestions({ domains: [], services: [] })
      return
    }
    const timer = setTimeout(() => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      setLoading(true)
      fetch('/api/ai/suggest-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          description: desc,
          currentDomains,
          currentServices,
          availableDomains,
          availableServices,
        }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (controller.signal.aborted) return
          if (!data.success) {
            if (data.message) toast.error(data.message)
            setSuggestions({ domains: [], services: [] })
          } else {
            setSuggestions({
              domains: Array.isArray(data.domains) ? data.domains : [],
              services: Array.isArray(data.services) ? data.services : [],
              output: typeof data.output === 'string' ? data.output : undefined,
            })
          }
        })
        .catch((err) => {
          if (err?.name === 'AbortError') return
          toast.error('Could not load tag suggestions')
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false)
        })
    }, 500)

    return () => {
      clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desc, currentDomains.join('|'), currentServices.join('|')])

  const dismissKey = (type: string, tag: string) => `${type}:${tag.toLowerCase()}`

  const visibleDomains = suggestions.domains.filter(
    (t) => !dismissed.has(dismissKey('d', t)) && !currentDomains.some((c) => c.toLowerCase() === t.toLowerCase()),
  )
  const visibleServices = suggestions.services.filter(
    (t) => !dismissed.has(dismissKey('s', t)) && !currentServices.some((c) => c.toLowerCase() === t.toLowerCase()),
  )
  const showOutput =
    suggestions.output &&
    suggestions.output.toLowerCase() !== currentOutput.toLowerCase() &&
    !dismissed.has(dismissKey('o', suggestions.output))

  if (tooShort) return null
  if (!loading && visibleDomains.length === 0 && visibleServices.length === 0 && !showOutput) return null

  const labelClass = dark ? 'text-white/60' : 'text-black/60'
  const chipClass = dark
    ? 'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-colors'
    : 'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-black/5 hover:bg-black/10 text-black border border-black/10 transition-colors'

  const dismiss = (type: string, tag: string) => {
    setDismissed((prev) => {
      const next = new Set(prev)
      next.add(dismissKey(type, tag))
      return next
    })
  }

  return (
    <div className="mt-3 space-y-2">
      <div className={`text-[11px] uppercase tracking-wide ${labelClass}`}>
        Suggested tags {loading && <span className="ml-1 opacity-60">loading…</span>}
      </div>
      {visibleDomains.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`text-[11px] ${labelClass}`}>Domains:</span>
          {visibleDomains.map((tag) => (
            <button
              key={`d-${tag}`}
              type="button"
              className={chipClass}
              onClick={() => {
                onAddDomain(tag)
                dismiss('d', tag)
              }}
              title={`Add "${tag}" to domains`}
            >
              <span>+</span>
              <span>{tag}</span>
            </button>
          ))}
        </div>
      )}
      {visibleServices.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`text-[11px] ${labelClass}`}>Services:</span>
          {visibleServices.map((tag) => (
            <button
              key={`s-${tag}`}
              type="button"
              className={chipClass}
              onClick={() => {
                onAddService(tag)
                dismiss('s', tag)
              }}
              title={`Add "${tag}" to services`}
            >
              <span>+</span>
              <span>{tag}</span>
            </button>
          ))}
        </div>
      )}
      {showOutput && suggestions.output && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`text-[11px] ${labelClass}`}>Category:</span>
          <button
            type="button"
            className={chipClass}
            onClick={() => {
              if (suggestions.output) {
                onSetOutput(suggestions.output)
                dismiss('o', suggestions.output)
              }
            }}
            title={`Set category to "${suggestions.output}"`}
          >
            <span>+</span>
            <span>{suggestions.output}</span>
          </button>
        </div>
      )}
    </div>
  )
}
