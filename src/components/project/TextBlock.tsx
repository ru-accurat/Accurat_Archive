interface Props {
  title: string
  content: string
  large?: boolean
  isAiGenerated?: boolean
  dark?: boolean
}

export function TextBlock({ title, content, large = false, isAiGenerated = false, dark = false }: Props) {
  if (!content) {
    return (
      <div>
        <h3 className={`text-[10px] font-[500] uppercase tracking-[0.1em] mb-3 ${
          dark ? 'text-white/30' : 'text-[var(--c-gray-400)]'
        }`}>
          {title}
        </h3>
        <div className={`text-[13px] font-[350] italic ${
          dark ? 'text-white/15' : 'text-[var(--c-gray-300)]'
        }`}>
          No {title.toLowerCase()} yet
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      <h3 className={`text-[10px] font-[500] uppercase tracking-[0.1em] mb-4 ${
        dark ? 'text-white/40' : 'text-[var(--c-gray-400)]'
      }`}>
        {title}
        {isAiGenerated && (
          <span className="ml-2 px-1.5 py-0.5 rounded-[2px] text-[9px] font-[500] bg-[var(--c-ai-bg)] text-[var(--c-ai)]">
            AI
          </span>
        )}
      </h3>
      <div
        className={`whitespace-pre-line ${
          large
            ? `text-[20px] leading-[1.5] font-[300] ${dark ? 'text-white/90' : 'text-[var(--c-gray-800)]'}`
            : `text-[14px] leading-[1.75] font-[400] ${dark ? 'text-white/70' : 'text-[var(--c-gray-600)]'}`
        }`}
      >
        {content}
      </div>
    </div>
  )
}
