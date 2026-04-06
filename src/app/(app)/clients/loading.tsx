export default function Loading() {
  return (
    <div className="h-full overflow-y-auto bg-[var(--c-white)]">
      <div className="max-w-[1000px] px-4 sm:px-6 md:px-[48px] py-10">
        <div className="h-[28px] w-32 bg-[var(--c-gray-100)] rounded animate-pulse mb-6" />
        <div className="h-[32px] w-64 bg-[var(--c-gray-100)] rounded animate-pulse mb-4" />
        <div className="border border-[var(--c-gray-100)] rounded-[var(--radius-sm)] overflow-hidden">
          <div className="h-[40px] bg-[var(--c-gray-50)] border-b border-[var(--c-gray-100)]" />
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-[40px] border-b border-[var(--c-gray-50)] flex items-center px-3 gap-4">
              <div className="h-3 w-40 bg-[var(--c-gray-100)] rounded animate-pulse" />
              <div className="ml-auto h-3 w-20 bg-[var(--c-gray-100)] rounded animate-pulse" />
              <div className="h-3 w-12 bg-[var(--c-gray-100)] rounded animate-pulse" />
              <div className="h-3 w-12 bg-[var(--c-gray-100)] rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
