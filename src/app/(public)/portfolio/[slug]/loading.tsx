export default function Loading() {
  return (
    <div className="max-w-[1200px] px-4 sm:px-6 md:px-[48px] py-12 mx-auto">
      <div className="h-[40px] w-2/3 bg-[var(--c-gray-100)] rounded animate-pulse mb-4" />
      <div className="h-3 w-32 bg-[var(--c-gray-100)] rounded animate-pulse mb-10" />
      <div className="aspect-[16/9] w-full bg-[var(--c-gray-100)] rounded animate-pulse mb-8" />
      <div className="flex flex-col gap-3">
        <div className="h-3 w-full bg-[var(--c-gray-100)] rounded animate-pulse" />
        <div className="h-3 w-5/6 bg-[var(--c-gray-100)] rounded animate-pulse" />
        <div className="h-3 w-4/6 bg-[var(--c-gray-100)] rounded animate-pulse" />
      </div>
    </div>
  )
}
