'use client'

import { useState, useRef, useEffect } from 'react'

interface Props {
  title: string
  tags: string[]
  onChange: (tags: string[]) => void
  allTags: string[]
}

export function ChecklistTagField({ title, tags, onChange, allTags }: Props) {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState<string[]>([])
  const [newTag, setNewTag] = useState('')
  const panelRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Merge allTags with currently selected (in case some tags aren't in the global list)
  const allUnique = [...new Set([...allTags, ...tags])].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: 'base' })
  )

  // When opening, initialize pending from current tags
  useEffect(() => {
    if (open) {
      setPending([...tags])
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  // Close on click outside
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const toggleTag = (tag: string) => {
    setPending((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  const handleApply = () => {
    onChange(pending)
    setOpen(false)
  }

  const handleAddNew = () => {
    const trimmed = newTag.trim()
    if (trimmed && !pending.includes(trimmed)) {
      setPending((prev) => [...prev, trimmed])
    }
    setNewTag('')
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddNew()
    }
  }

  const pendingChanged =
    pending.length !== tags.length ||
    pending.some((t) => !tags.includes(t)) ||
    tags.some((t) => !pending.includes(t))

  return (
    <div className="py-5 relative" ref={panelRef}>
      <h3 className="text-[10px] font-[500] uppercase tracking-[0.1em] text-[var(--c-gray-400)] mb-2.5">
        {title}
      </h3>

      {/* Current tags display + edit button */}
      <div className="flex flex-wrap gap-2 pb-2 border-b border-[var(--c-gray-200)] min-h-[40px] items-center">
        {tags.length === 0 && !open && (
          <span className="text-[13px] text-[var(--c-gray-300)] font-[400]">
            No {title.toLowerCase()} selected
          </span>
        )}
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-sm)] text-[11px] font-[450] bg-[var(--c-gray-900)] text-white"
          >
            {tag}
          </span>
        ))}
        <button
          onClick={() => setOpen(!open)}
          className="ml-auto text-[11px] font-[450] px-3 py-1 rounded-[var(--radius-sm)] border border-[var(--c-gray-200)] text-[var(--c-gray-500)] hover:border-[var(--c-gray-400)] hover:text-[var(--c-gray-700)] transition-colors duration-150"
        >
          {open ? 'Close' : 'Edit'}
        </button>
      </div>

      {/* Checklist panel */}
      {open && (
        <div className="mt-2 border border-[var(--c-gray-200)] rounded-[var(--radius-md)] shadow-[var(--shadow-lg)] bg-white overflow-hidden">
          {/* Scrollable checklist */}
          <div className="max-h-[240px] overflow-y-auto py-1">
            {allUnique.map((tag) => {
              const checked = pending.includes(tag)
              return (
                <button
                  type="button"
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className="flex items-center gap-3 px-4 py-2 w-full text-left cursor-pointer hover:bg-[var(--c-gray-50)] transition-colors duration-100"
                >
                  <span
                    className={`w-4 h-4 rounded-[3px] border flex-shrink-0 flex items-center justify-center transition-all duration-150 ${
                      checked
                        ? 'bg-[var(--c-gray-900)] border-[var(--c-gray-900)]'
                        : 'border-[var(--c-gray-300)] bg-white'
                    }`}
                  >
                    {checked && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 3.5L3.5 6L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                  <span className="text-[13px] font-[400] text-[var(--c-gray-700)]">{tag}</span>
                </button>
              )
            })}
            {allUnique.length === 0 && (
              <div className="px-4 py-3 text-[12px] text-[var(--c-gray-400)]">No tags yet. Add one below.</div>
            )}
          </div>

          {/* Add new tag input */}
          <div className="border-t border-[var(--c-gray-100)] px-4 py-2.5 flex items-center gap-2">
            <input
              ref={inputRef}
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Add new ${title.toLowerCase().replace(/s$/, '')}...`}
              className="flex-1 text-[13px] font-[400] outline-none bg-transparent text-[var(--c-gray-700)] placeholder:text-[var(--c-gray-300)]"
            />
            {newTag.trim() && (
              <button
                onClick={handleAddNew}
                className="text-[11px] font-[450] px-2.5 py-1 rounded-[var(--radius-sm)] bg-[var(--c-gray-100)] text-[var(--c-gray-600)] hover:bg-[var(--c-gray-200)] transition-colors duration-150"
              >
                Add
              </button>
            )}
          </div>

          {/* Apply button */}
          <div className="border-t border-[var(--c-gray-100)] px-4 py-2.5 flex items-center justify-between">
            <span className="text-[11px] text-[var(--c-gray-400)]">
              {pending.length} selected
            </span>
            <button
              onClick={handleApply}
              disabled={!pendingChanged}
              className="text-[11px] font-[500] px-4 py-1.5 rounded-[var(--radius-sm)] bg-[var(--c-gray-900)] text-white hover:bg-[var(--c-gray-800)] transition-colors duration-150 disabled:opacity-30 disabled:cursor-default"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
