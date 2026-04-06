export default function Loading() {
  return (
    <div className="flex flex-col h-[calc(100vh-var(--topbar-h))] bg-[var(--c-white)]">
      <div className="px-4 sm:px-6 md:px-[48px] pt-5 pb-3 flex items-center justify-between shrink-0">
        <div>
          <div className="h-[28px] w-16 bg-[var(--c-gray-100)] rounded animate-pulse" />
          <div className="h-3 w-48 bg-[var(--c-gray-100)] rounded animate-pulse mt-2" />
        </div>
        <div className="h-[32px] w-32 bg-[var(--c-gray-100)] rounded animate-pulse" />
      </div>
      <div className="flex-1 bg-[var(--c-gray-100)] animate-pulse" />
    </div>
  )
}
