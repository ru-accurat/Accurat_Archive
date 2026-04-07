export default function Loading() {
  return (
    <div className="h-full overflow-y-auto bg-[var(--c-white)]">
      <div className="max-w-[720px] mx-auto px-4 sm:px-6 md:px-[48px] py-10">
        <div className="h-[28px] w-32 bg-[var(--c-gray-100)] rounded animate-pulse mb-8" />
        <div className="flex flex-col gap-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i}>
              <div className="h-4 w-40 bg-[var(--c-gray-100)] rounded animate-pulse mb-3" />
              <div className="h-[40px] w-full bg-[var(--c-gray-100)] rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
