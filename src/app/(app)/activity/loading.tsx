export default function Loading() {
  return (
    <div className="h-full overflow-y-auto bg-[var(--c-white)]">
      <div className="max-w-[720px] px-4 sm:px-6 md:px-[48px] py-10">
        <div className="h-[28px] w-32 bg-[var(--c-gray-100)] rounded animate-pulse mb-8" />
        <div className="flex flex-col gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-2">
              <div className="h-3 w-20 bg-[var(--c-gray-100)] rounded animate-pulse" />
              <div className="h-3 w-64 bg-[var(--c-gray-100)] rounded animate-pulse" />
              <div className="h-3 w-24 bg-[var(--c-gray-100)] rounded animate-pulse ml-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
