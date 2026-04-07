export default function Loading() {
  return (
    <div className="h-full overflow-y-auto bg-[var(--c-white)]">
      <div className="max-w-[1200px] px-4 sm:px-6 md:px-[48px] py-10">
        <div className="h-[32px] w-64 bg-[var(--c-gray-100)] rounded animate-pulse mb-4" />
        <div className="h-[16px] w-96 bg-[var(--c-gray-100)] rounded animate-pulse mb-10" />
        {Array.from({ length: 3 }).map((_, s) => (
          <div key={s} className="mb-10">
            <div className="h-[20px] w-40 bg-[var(--c-gray-100)] rounded animate-pulse mb-4" />
            <div className="border border-[var(--c-gray-100)] rounded-[var(--radius-sm)] overflow-hidden">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-[44px] border-b border-[var(--c-gray-50)] flex items-center px-3 gap-4"
                >
                  <div className="h-3 w-40 bg-[var(--c-gray-100)] rounded animate-pulse" />
                  <div className="ml-auto h-3 w-12 bg-[var(--c-gray-100)] rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
