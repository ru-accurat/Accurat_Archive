'use client'

import { useState, useRef } from 'react'

interface Props {
  title: string
  tags: string[]
  onChange: (tags: string[]) => void
  suggestions?: string[]
  placeholder?: string
}

export function EditableTagsField({ title, tags, onChange, suggestions = [], placeholder }: Props) {
  const [input, setInput] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const filteredSuggestions = suggestions.filter(
    (s) => s.toLowerCase().includes(input.toLowerCase()) && !tags.includes(s)
  )

  const addTag = (tag: string) => {
    if (tag && !tags.includes(tag)) {
      onChange([...tags, tag])
    }
    setInput('')
    setShowSuggestions(false)
    inputRef.current?.focus()
  }

  const removeTag = (tag: string) => {
    onChange(tags.filter((t) => t !== tag))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && input.trim()) {
      e.preventDefault()
      addTag(input.trim())
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      removeTag(tags[tags.length - 1])
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
    }
  }

  return (
    <div className="py-5">
      <h3 className="text-[10px] font-[500] uppercase tracking-[0.1em] text-[var(--c-gray-400)] mb-2.5">
        {title}
      </h3>
      <div className="flex flex-wrap gap-2 pb-2 border-b border-[var(--c-gray-200)] focus-within:border-[var(--c-gray-900)] min-h-[40px] relative transition-colors duration-200">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-sm)] text-[11px] font-[450] bg-[var(--c-gray-900)] text-white"
          >
            {tag}
            <button
              onClick={() => removeTag(tag)}
              className="text-white/40 hover:text-white transition-colors duration-150"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2.5 2.5l5 5M7.5 2.5l-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => {
            setInput(e.target.value)
            setShowSuggestions(true)
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? placeholder || `Add ${title.toLowerCase()}...` : ''}
          className="flex-1 min-w-[120px] text-[13px] font-[400] outline-none bg-transparent text-[var(--c-gray-700)] placeholder:text-[var(--c-gray-300)]"
        />

        {showSuggestions && filteredSuggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-[var(--c-gray-200)] rounded-[var(--radius-md)] shadow-[var(--shadow-lg)] max-h-40 overflow-y-auto z-10">
            {filteredSuggestions.slice(0, 10).map((s) => (
              <button
                key={s}
                onMouseDown={(e) => {
                  e.preventDefault()
                  addTag(s)
                }}
                className="w-full text-left px-4 py-2 text-[13px] font-[400] hover:bg-[var(--c-gray-50)] text-[var(--c-gray-600)] transition-colors duration-150"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
