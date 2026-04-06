export default function Loading() {
  return (
    <div className="flex flex-col h-full bg-[var(--c-white)]">
      <div className="px-4 sm:px-6 md:px-[48px] pt-5 pb-3 flex items-start justify-between">
        <div>
          <div className="h-[28px] w-32 bg-[var(--c-gray-100)] rounded animate-pulse" />
          <div className="h-3 w-48 bg-[var(--c-gray-100)] rounded animate-pulse mt-2" />
        </div>
        <div className="h-[32px] w-32 bg-[var(--c-gray-100)] rounded animate-pulse" />
      </div>
      <div className="flex-1 overflow-hidden p-4 sm:p-6 md:p-[48px] pt-5">
        <div className="space-y-2">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="h-[28px] bg-[var(--c-gray-100)] rounded animate-pulse" style={{ width: `${40 + Math.random() * 50}%` }} />
          ))}
        </div>
      </div>
    </div>
  )
}
