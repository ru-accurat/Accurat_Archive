export default function Loading() {
  return (
    <div className="flex flex-col h-full bg-[var(--c-white)]">
      <div className="flex items-end gap-4 px-4 sm:px-6 md:px-[48px] pt-5 pb-3">
        <div className="flex-1 h-[32px] bg-[var(--c-gray-100)] rounded animate-pulse" />
        <div className="h-[32px] w-32 bg-[var(--c-gray-100)] rounded animate-pulse" />
      </div>
      <div className="h-[40px] border-t border-[var(--c-gray-100)]" />
      <div className="flex-1 overflow-hidden p-4 sm:p-6 md:p-[48px] pt-5">
        <div
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}
          className="grid gap-5"
        >
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i}>
              <div className="aspect-[16/10] bg-[var(--c-gray-100)] animate-pulse mb-3" />
              <div className="h-3 w-24 bg-[var(--c-gray-100)] rounded animate-pulse mb-1.5" />
              <div className="h-3 w-40 bg-[var(--c-gray-100)] rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
