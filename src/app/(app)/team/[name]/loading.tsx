export default function Loading() {
  return (
    <div className="h-full overflow-y-auto bg-[var(--c-white)]">
      <div className="max-w-[1200px] px-4 sm:px-6 md:px-[48px] py-10 mx-auto">
        <div className="h-3 w-40 bg-[var(--c-gray-100)] rounded animate-pulse mb-4" />
        <div className="h-[28px] w-56 bg-[var(--c-gray-100)] rounded animate-pulse mb-8" />
        <div className="flex gap-8 mb-10">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i}>
              <div className="h-[24px] w-12 bg-[var(--c-gray-100)] rounded animate-pulse mb-1" />
              <div className="h-2 w-16 bg-[var(--c-gray-100)] rounded animate-pulse" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i}>
              <div className="aspect-[4/3] bg-[var(--c-gray-100)] rounded-[var(--radius-sm)] animate-pulse mb-2" />
              <div className="h-3 w-3/4 bg-[var(--c-gray-100)] rounded animate-pulse mb-1" />
              <div className="h-2 w-1/2 bg-[var(--c-gray-100)] rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
