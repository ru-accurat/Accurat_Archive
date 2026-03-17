interface Props {
  urls: string[]
  dark?: boolean
}

export function UrlLinks({ urls, dark = false }: Props) {
  const validUrls = urls.filter(Boolean)
  if (validUrls.length === 0) return null

  return (
    <div>
      <h3 className={`text-[10px] font-[500] uppercase tracking-[0.1em] mb-4 ${
        dark ? 'text-white/40' : 'text-[var(--c-gray-400)]'
      }`}>
        Links
      </h3>
      <div className="flex flex-col gap-2">
        {validUrls.map((url, i) => (
          <a
            key={i}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={`text-[13px] font-[400] truncate transition-colors duration-200 underline underline-offset-2 decoration-1 ${
              dark
                ? 'text-white/50 decoration-white/20 hover:text-white/80'
                : 'text-[var(--c-gray-500)] decoration-[var(--c-gray-300)] hover:text-[var(--c-gray-900)]'
            }`}
          >
            {url}
          </a>
        ))}
      </div>
    </div>
  )
}
