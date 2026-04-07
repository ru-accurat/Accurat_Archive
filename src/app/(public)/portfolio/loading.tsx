export default function Loading() {
  return (
    <div className="max-w-[1200px] px-4 sm:px-6 md:px-[48px] py-12 mx-auto">
      <div className="mb-10">
        <div className="h-[36px] w-48 bg-[var(--c-gray-100)] rounded animate-pulse mb-3" />
        <div className="h-3 w-24 bg-[var(--c-gray-100)] rounded animate-pulse" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="aspect-[4/3] bg-[var(--c-gray-100)] rounded animate-pulse" />
        ))}
      </div>
    </div>
  )
}
