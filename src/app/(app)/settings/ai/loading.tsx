export default function Loading() {
  return (
    <div className="h-full overflow-y-auto bg-[var(--c-white)]">
      <div className="max-w-[1000px] px-4 sm:px-6 md:px-[48px] py-10">
        <div className="h-3 w-48 bg-[var(--c-gray-100)] rounded animate-pulse mb-4" />
        <div className="h-[28px] w-40 bg-[var(--c-gray-100)] rounded animate-pulse mb-8" />
        <div className="flex gap-2 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[32px] w-24 bg-[var(--c-gray-100)] rounded animate-pulse" />
          ))}
        </div>
        <div className="h-[400px] w-full bg-[var(--c-gray-100)] rounded animate-pulse" />
      </div>
    </div>
  )
}
