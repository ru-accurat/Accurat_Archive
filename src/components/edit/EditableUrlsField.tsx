'use client'

interface Props {
  urls: string[]
  onChange: (urls: string[]) => void
}

export function EditableUrlsField({ urls, onChange }: Props) {
  const paddedUrls = [...urls]
  while (paddedUrls.length < 3) paddedUrls.push('')

  const updateUrl = (index: number, value: string) => {
    const newUrls = [...paddedUrls]
    newUrls[index] = value
    onChange(newUrls.filter(Boolean))
  }

  return (
    <div className="py-5">
      <h3 className="text-[10px] font-[500] uppercase tracking-[0.1em] text-[var(--c-gray-400)] mb-2.5">
        URLs
      </h3>
      <div className="flex flex-col gap-3">
        {paddedUrls.map((url, i) => (
          <input
            key={i}
            type="url"
            value={url}
            onChange={(e) => updateUrl(i, e.target.value)}
            placeholder={`URL ${i + 1}`}
            className={`w-full px-0 py-2 text-[13px] font-[400] bg-transparent border-b focus:outline-none transition-colors duration-200 text-[var(--c-gray-800)] placeholder:text-[var(--c-gray-300)] ${
              url ? 'border-[var(--c-gray-200)] focus:border-[var(--c-gray-900)]' : 'border-dashed border-[var(--c-gray-200)] focus:border-[var(--c-gray-900)]'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
