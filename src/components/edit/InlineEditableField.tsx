'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

interface InlineEditableFieldProps {
  value: string
  onSave: (newValue: string) => Promise<void> | void
  placeholder?: string
  className?: string
  multiline?: boolean
  large?: boolean
  dark?: boolean
  title?: string
  isAiGenerated?: boolean
}

/**
 * Multi-line click-to-edit field. Click text → textarea appears (autosized).
 * Blur or Cmd+Enter saves, Esc cancels.
 */
export function InlineEditableField({
  value,
  onSave,
  placeholder = 'Click to edit…',
  className = '',
  multiline = true,
  large = false,
  dark = false,
  title,
  isAiGenerated = false,
}: InlineEditableFieldProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value ?? '')
  const [saving, setSaving] = useState(false)
  const taRef = useRef<HTMLTextAreaElement>(null)
  const savedRef = useRef(false)

  useEffect(() => {
    if (!editing) setDraft(value ?? '')
  }, [value, editing])

  // Autosize textarea
  const autosize = useCallback(() => {
    const el = taRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [])

  useEffect(() => {
    if (editing && taRef.current) {
      taRef.current.focus()
      const len = taRef.current.value.length
      taRef.current.setSelectionRange(len, len)
      autosize()
      savedRef.current = false
    }
  }, [editing, autosize])

  const doSave = useCallback(async (nv: string) => {
    if (savedRef.current) return
    savedRef.current = true
    const original = value ?? ''
    if (nv === original) {
      setEditing(false)
      return
    }
    setSaving(true)
    try {
      await onSave(nv)
    } catch (err) {
      console.error('InlineEditableField save failed:', err)
    } finally {
      setSaving(false)
      setEditing(false)
    }
  }, [value, onSave])

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      savedRef.current = true
      setDraft(value ?? '')
      setEditing(false)
    } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      doSave(draft)
    } else if (!multiline && e.key === 'Enter') {
      e.preventDefault()
      doSave(draft)
    }
  }

  const textColor = dark ? 'text-white' : 'text-[var(--c-gray-900)]'
  const mutedColor = dark ? 'text-white/30' : 'text-[var(--c-gray-300)]'
  const hoverBg = dark ? 'hover:bg-white/5' : 'hover:bg-[var(--c-gray-50)]'
  const sizeCls = large
    ? 'text-[18px] sm:text-[20px] font-[350] leading-[1.4]'
    : 'text-[14px] font-[400] leading-[1.6]'

  return (
    <div className={`group ${className}`}>
      {title && (
        <div className="flex items-center gap-2 mb-2">
          <h3 className={`text-[10px] font-[500] uppercase tracking-[0.1em] ${dark ? 'text-white/40' : 'text-[var(--c-gray-400)]'}`}>{title}</h3>
          {isAiGenerated && (
            <span className="text-[9px] font-[500] uppercase tracking-[0.08em] px-1.5 py-0.5 rounded-[var(--radius-sm)] bg-[var(--c-ai)]/15 text-[var(--c-ai)]">AI</span>
          )}
        </div>
      )}
      {editing ? (
        <textarea
          ref={taRef}
          value={draft}
          onChange={(e) => { setDraft(e.target.value); autosize() }}
          onBlur={() => doSave(draft)}
          onKeyDown={handleKey}
          disabled={saving}
          rows={1}
          className={`${sizeCls} w-full bg-transparent border-b border-[var(--c-gray-900)] outline-none resize-none ${textColor} ${dark ? 'border-white/40' : ''}`}
        />
      ) : (
        <button
          type="button"
          onClick={() => { setDraft(value ?? ''); setEditing(true) }}
          className={`block w-full text-left rounded-[var(--radius-sm)] px-2 -mx-2 py-1 transition-colors cursor-text ${hoverBg} ${sizeCls} ${value ? textColor : mutedColor} whitespace-pre-wrap`}
        >
          {value || placeholder}
        </button>
      )}
    </div>
  )
}
