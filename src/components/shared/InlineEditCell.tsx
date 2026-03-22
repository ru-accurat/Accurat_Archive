'use client'

import { useState, useRef, useEffect } from 'react'

interface InlineEditCellProps {
  value: string | number | null
  onSave: (newValue: string) => Promise<void> | void
  type?: 'text' | 'number' | 'select'
  options?: { label: string; value: string }[]
  placeholder?: string
  formatDisplay?: (value: string | number | null) => string
  className?: string
}

export function InlineEditCell({
  value,
  onSave,
  type = 'text',
  options,
  placeholder = '—',
  formatDisplay,
  className = '',
}: InlineEditCellProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(value ?? ''))
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null)

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      if (inputRef.current instanceof HTMLInputElement) {
        inputRef.current.select()
      }
    }
  }, [editing])

  const displayValue = formatDisplay
    ? formatDisplay(value)
    : value != null && value !== ''
      ? String(value)
      : placeholder

  const handleSave = async () => {
    if (draft === String(value ?? '')) {
      setEditing(false)
      return
    }
    setSaving(true)
    try {
      await onSave(draft)
    } finally {
      setSaving(false)
      setEditing(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      setDraft(String(value ?? ''))
      setEditing(false)
    }
  }

  if (editing) {
    if (type === 'select' && options) {
      return (
        <select
          ref={inputRef as React.RefObject<HTMLSelectElement>}
          value={draft}
          onChange={(e) => { setDraft(e.target.value); }}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          disabled={saving}
          className={`text-[12px] bg-white border border-[var(--c-gray-300)] rounded-[var(--radius-sm)] px-2 py-1 outline-none focus:border-[var(--c-gray-900)] cursor-pointer ${className}`}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      )
    }

    return (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type={type === 'number' ? 'number' : 'text'}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        disabled={saving}
        step={type === 'number' ? 'any' : undefined}
        className={`text-[12px] bg-white border border-[var(--c-gray-300)] rounded-[var(--radius-sm)] px-2 py-1 outline-none focus:border-[var(--c-gray-900)] w-full ${className}`}
      />
    )
  }

  return (
    <button
      onClick={() => { setDraft(String(value ?? '')); setEditing(true) }}
      className={`text-left text-[12px] px-2 py-1 rounded-[var(--radius-sm)] hover:bg-[var(--c-gray-50)] transition-colors group cursor-text w-full ${
        value != null && value !== '' ? 'text-[var(--c-gray-700)]' : 'text-[var(--c-gray-300)]'
      } ${className}`}
    >
      <span className="flex items-center gap-1.5">
        {displayValue}
        <svg className="w-3 h-3 text-[var(--c-gray-300)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" viewBox="0 0 12 12" fill="none">
          <path d="M8.5 1.5l2 2-6 6H2.5v-2l6-6z" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" />
        </svg>
      </span>
    </button>
  )
}
