export default function Loading() {
  return (
    <div className="h-full overflow-y-auto bg-[var(--c-white)]">
      <div className="max-w-[1200px] px-4 sm:px-6 md:px-[48px] py-10">
        <div className="h-3 w-32 bg-[var(--c-gray-100)] rounded animate-pulse mb-4" />
        <div className="h-[36px] w-64 bg-[var(--c-gray-100)] rounded animate-pulse mb-8" />
        <div className="grid grid-cols-3 gap-4 mb-10">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-[80px] bg-[var(--c-gray-100)] rounded animate-pulse" />
          ))}
        </div>
        <div className="border border-[var(--c-gray-100)] rounded-[var(--radius-sm)] overflow-hidden">
          <div className="h-[40px] bg-[var(--c-gray-50)] border-b border-[var(--c-gray-100)]" />
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-[36px] border-b border-[var(--c-gray-50)] flex items-center px-3 gap-4">
              <div className="h-3 w-40 bg-[var(--c-gray-100)] rounded animate-pulse" />
              <div className="h-3 w-16 bg-[var(--c-gray-100)] rounded animate-pulse ml-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
