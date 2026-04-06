export default function Loading() {
  return (
    <div className="h-full overflow-y-auto bg-[var(--c-white)]">
      <div className="max-w-[1000px] px-4 sm:px-6 md:px-[48px] py-10">
        <div className="flex items-center justify-between mb-6">
          <div className="h-[28px] w-40 bg-[var(--c-gray-100)] rounded animate-pulse" />
          <div className="h-[32px] w-32 bg-[var(--c-gray-100)] rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="border border-[var(--c-gray-100)] rounded-[var(--radius-sm)] p-4">
              <div className="h-4 w-3/4 bg-[var(--c-gray-100)] rounded animate-pulse mb-2" />
              <div className="h-3 w-1/2 bg-[var(--c-gray-100)] rounded animate-pulse mb-3" />
              <div className="h-3 w-20 bg-[var(--c-gray-100)] rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
