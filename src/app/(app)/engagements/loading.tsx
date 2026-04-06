export default function Loading() {
  return (
    <div className="h-full overflow-y-auto bg-[var(--c-white)]">
      <div className="max-w-[1200px] px-4 sm:px-6 md:px-[48px] py-10">
        <div className="flex items-center justify-between mb-6">
          <div className="h-[28px] w-40 bg-[var(--c-gray-100)] rounded animate-pulse" />
          <div className="h-[32px] w-28 bg-[var(--c-gray-100)] rounded animate-pulse" />
        </div>
        <div className="mb-6">
          <div className="h-[40px] w-64 bg-[var(--c-gray-100)] rounded animate-pulse mb-3" />
          <div className="flex gap-6">
            <div className="h-3 w-24 bg-[var(--c-gray-100)] rounded animate-pulse" />
            <div className="h-3 w-20 bg-[var(--c-gray-100)] rounded animate-pulse" />
            <div className="h-3 w-20 bg-[var(--c-gray-100)] rounded animate-pulse" />
          </div>
        </div>
        <div className="border border-[var(--c-gray-100)] rounded-[var(--radius-sm)] overflow-hidden">
          <div className="h-[40px] bg-[var(--c-gray-50)] border-b border-[var(--c-gray-100)]" />
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-[36px] border-b border-[var(--c-gray-50)] flex items-center px-3 gap-4">
              <div className="h-3 w-12 bg-[var(--c-gray-100)] rounded animate-pulse" />
              <div className="h-3 w-48 bg-[var(--c-gray-100)] rounded animate-pulse" />
              <div className="h-3 w-32 bg-[var(--c-gray-100)] rounded animate-pulse ml-auto" />
              <div className="h-3 w-20 bg-[var(--c-gray-100)] rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
