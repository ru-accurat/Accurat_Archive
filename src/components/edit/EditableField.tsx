'use client'

import { useRef, useEffect } from 'react'

interface Props {
  title: string
  value: string
  onChange: (value: string) => void
  large?: boolean
  multiline?: boolean
  isAiGenerated?: boolean
  placeholder?: string
  onGenerate?: () => void
  generating?: boolean
}

export function EditableField({
  title,
  value,
  onChange,
  large = false,
  multiline = true,
  isAiGenerated = false,
  placeholder,
  onGenerate,
  generating = false
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [value])

  return (
    <div className="py-5">
      <div className="flex items-center gap-2 mb-2.5">
        <h3 className="text-[10px] font-[500] uppercase tracking-[0.1em] text-[var(--c-gray-400)]">
          {title}
        </h3>
        {isAiGenerated && (
          <span className="px-1.5 py-0.5 rounded-[2px] text-[9px] font-[500] bg-[var(--c-ai-bg)] text-[var(--c-ai)]">
            AI
          </span>
        )}
        {onGenerate && (
          <button
            onClick={onGenerate}
            disabled={generating}
            className="ml-auto flex items-center gap-1.5 text-[10px] font-[450] px-2.5 py-1 rounded-[var(--radius-sm)] bg-[var(--c-ai-bg)] text-[var(--c-ai)] hover:bg-[var(--c-ai)]/15 transition-colors duration-200 disabled:opacity-40"
          >
            {generating ? (
              <>
                <svg className="animate-spin w-3 h-3" viewBox="0 0 12 12" fill="none">
                  <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="20" strokeDashoffset="5" strokeLinecap="round" />
                </svg>
                Generating...
              </>
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M6 1l1.2 3.3L10.5 5l-3.3 1.2L6 9.5 4.8 6.2 1.5 5l3.3-1.2L6 1z" fill="currentColor" />
                </svg>
                Generate
              </>
            )}
          </button>
        )}
      </div>

      {multiline ? (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || `Add ${title.toLowerCase()}...`}
          className={`w-full px-0 py-2 resize-none bg-transparent border-b focus:outline-none transition-colors duration-200 ${
            large ? 'text-[20px] leading-[1.5] font-[300]' : 'text-[14px] leading-[1.75] font-[400]'
          } ${value ? 'border-[var(--c-gray-200)] focus:border-[var(--c-gray-900)]' : 'border-dashed border-[var(--c-gray-300)] focus:border-[var(--c-gray-900)]'} text-[var(--c-gray-800)] placeholder:text-[var(--c-gray-300)]`}
          rows={1}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || `Add ${title.toLowerCase()}...`}
          className={`w-full px-0 py-2 bg-transparent border-b focus:outline-none transition-colors duration-200 ${
            large ? 'text-[20px] font-[300]' : 'text-[14px] font-[400]'
          } ${value ? 'border-[var(--c-gray-200)] focus:border-[var(--c-gray-900)]' : 'border-dashed border-[var(--c-gray-300)] focus:border-[var(--c-gray-900)]'} text-[var(--c-gray-800)] placeholder:text-[var(--c-gray-300)]`}
        />
      )}
    </div>
  )
}
