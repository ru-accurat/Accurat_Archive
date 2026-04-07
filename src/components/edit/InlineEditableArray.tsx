'use client'

import { useState, useRef, useEffect } from 'react'

interface InlineEditableArrayProps {
  title?: string
  values: string[]
  onSave: (next: string[]) => Promise<void> | void
  placeholder?: string
  dark?: boolean
  className?: string
}

/**
 * Chips with × and inline + Add input. Saves on each mutation.
 */
export function InlineEditableArray({
  title,
  values,
  onSave,
  placeholder = 'Add…',
  dark = false,
  className = '',
}: InlineEditableArrayProps) {
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (adding) inputRef.current?.focus()
  }, [adding])

  const commitAdd = async () => {
    const val = draft.trim()
    setDraft('')
    setAdding(false)
    if (!val) return
    if (values.includes(val)) return
    await onSave([...values, val])
  }

  const removeAt = async (idx: number) => {
    const next = values.filter((_, i) => i !== idx)
    await onSave(next)
  }

  const chipBase = dark
    ? 'bg-white/10 text-white/80 border-white/20 hover:bg-white/15'
    : 'bg-[var(--c-gray-100)] text-[var(--c-gray-700)] border-[var(--c-gray-200)] hover:bg-[var(--c-gray-200)]'

  return (
    <div className={className}>
      {title && (
        <h3 className={`text-[10px] font-[500] uppercase tracking-[0.1em] mb-2 ${dark ? 'text-white/40' : 'text-[var(--c-gray-400)]'}`}>{title}</h3>
      )}
      <div className="flex flex-wrap gap-1.5 items-center">
        {values.map((tag, idx) => (
          <span
            key={`${tag}-${idx}`}
            className={`inline-flex items-center gap-1 text-[11px] font-[450] px-2 py-1 rounded-[var(--radius-sm)] border ${chipBase}`}
          >
            {tag}
            <button
              type="button"
              onClick={() => removeAt(idx)}
              className={`${dark ? 'text-white/40 hover:text-white' : 'text-[var(--c-gray-400)] hover:text-[var(--c-gray-900)]'} transition-colors`}
              aria-label={`Remove ${tag}`}
            >
              ×
            </button>
          </span>
        ))}
        {adding ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitAdd}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); commitAdd() }
              if (e.key === 'Escape') { setDraft(''); setAdding(false) }
            }}
            placeholder={placeholder}
            className={`text-[11px] font-[400] px-2 py-1 rounded-[var(--radius-sm)] border outline-none ${
              dark
                ? 'bg-transparent border-white/30 text-white placeholder-white/30'
                : 'bg-white border-[var(--c-gray-300)] text-[var(--c-gray-900)] placeholder-[var(--c-gray-400)]'
            }`}
          />
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className={`text-[11px] font-[400] px-2 py-1 rounded-[var(--radius-sm)] border border-dashed ${
              dark
                ? 'border-white/20 text-white/40 hover:text-white/80 hover:border-white/40'
                : 'border-[var(--c-gray-300)] text-[var(--c-gray-400)] hover:text-[var(--c-gray-900)] hover:border-[var(--c-gray-500)]'
            } transition-colors`}
          >
            + Add
          </button>
        )}
      </div>
    </div>
  )
}
