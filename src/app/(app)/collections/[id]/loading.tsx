export default function Loading() {
  return (
    <div className="h-full overflow-y-auto bg-[var(--c-white)]">
      <div className="max-w-[1400px] px-4 sm:px-6 md:px-[48px] py-10">
        <div className="h-3 w-40 bg-[var(--c-gray-100)] rounded animate-pulse mb-4" />
        <div className="h-[36px] w-80 bg-[var(--c-gray-100)] rounded animate-pulse mb-8" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-[4/3] bg-[var(--c-gray-100)] rounded animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  )
}
