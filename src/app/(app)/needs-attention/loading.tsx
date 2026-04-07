export default function Loading() {
  return (
    <div className="h-full overflow-y-auto bg-[var(--c-white)]">
      <div className="max-w-[1200px] px-4 sm:px-6 md:px-[48px] py-10">
        <div className="h-[28px] w-48 bg-[var(--c-gray-100)] rounded animate-pulse mb-4" />
        <div className="h-[16px] w-96 bg-[var(--c-gray-100)] rounded animate-pulse mb-10" />
        {Array.from({ length: 3 }).map((_, s) => (
          <div key={s} className="mb-12">
            <div className="h-[20px] w-64 bg-[var(--c-gray-100)] rounded animate-pulse mb-4" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="border border-[var(--c-gray-100)] rounded-[var(--radius-sm)] overflow-hidden">
                  <div className="aspect-[4/3] bg-[var(--c-gray-50)] animate-pulse" />
                  <div className="p-3">
                    <div className="h-[14px] w-3/4 bg-[var(--c-gray-100)] rounded animate-pulse mb-2" />
                    <div className="h-[12px] w-1/2 bg-[var(--c-gray-100)] rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
