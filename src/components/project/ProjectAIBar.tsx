'use client'

interface Props {
  onWriteCaseStudy: () => void
  onGenerateInUse: () => void
  hasMedia: boolean
}

export function ProjectAIBar({ onWriteCaseStudy, onGenerateInUse, hasMedia }: Props) {
  return (
    <div className="sticky bottom-4 z-30 flex justify-center pointer-events-none">
      <div className="pointer-events-auto inline-flex items-center gap-2 px-3 py-2 rounded-full bg-[var(--c-gray-900)]/90 backdrop-blur-md shadow-lg">
        <button
          onClick={onWriteCaseStudy}
          className="text-[11px] font-[500] px-3 py-1.5 rounded-full bg-[var(--c-ai)]/15 text-[var(--c-ai)] hover:bg-[var(--c-ai)]/25 transition-colors"
        >
          Write Case Study
        </button>
        <button
          onClick={onGenerateInUse}
          disabled={!hasMedia}
          className="text-[11px] font-[500] px-3 py-1.5 rounded-full bg-[var(--c-ai)]/15 text-[var(--c-ai)] hover:bg-[var(--c-ai)]/25 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Generate In-Use Image
        </button>
      </div>
    </div>
  )
}
