export default function Loading() {
  return (
    <div className="h-full overflow-y-auto bg-[var(--c-white)]">
      <div className="max-w-[1200px] px-4 sm:px-6 md:px-[48px] py-10 mx-auto">
        <div className="mb-8">
          <div className="h-[28px] w-32 bg-[var(--c-gray-100)] rounded animate-pulse mb-2" />
          <div className="h-3 w-48 bg-[var(--c-gray-100)] rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="border border-[var(--c-gray-100)] rounded-[var(--radius-sm)] p-4">
              <div className="h-3 w-32 bg-[var(--c-gray-100)] rounded animate-pulse mb-2" />
              <div className="h-2 w-20 bg-[var(--c-gray-100)] rounded animate-pulse mb-3" />
              <div className="flex gap-1">
                <div className="h-3 w-12 bg-[var(--c-gray-100)] rounded-full animate-pulse" />
                <div className="h-3 w-16 bg-[var(--c-gray-100)] rounded-full animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
