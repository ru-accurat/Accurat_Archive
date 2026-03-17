interface Props {
  percentage: number
  size?: 'sm' | 'md'
}

export function CompletenessIndicator({ percentage, size = 'sm' }: Props) {
  const width = size === 'sm' ? 48 : 64
  const height = size === 'sm' ? 3 : 4

  return (
    <div className="flex items-center gap-2.5">
      <div
        className="rounded-[1px] bg-[var(--c-gray-200)] overflow-hidden"
        style={{ width, height }}
      >
        <div
          className="h-full rounded-[1px] transition-all duration-300"
          style={{
            width: `${percentage}%`,
            backgroundColor: percentage >= 80 ? 'var(--c-gray-900)' : percentage >= 40 ? 'var(--c-gray-500)' : 'var(--c-gray-400)'
          }}
        />
      </div>
      <span className="text-[10px] text-[var(--c-gray-400)] font-[450] tabular-nums">{percentage}%</span>
    </div>
  )
}
