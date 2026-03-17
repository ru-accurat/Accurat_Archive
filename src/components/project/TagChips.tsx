interface Props {
  domains: string[]
  services: string[]
  output: string
  dark?: boolean
}

export function TagChips({ domains, services, output, dark = false }: Props) {
  if (domains.length === 0 && services.length === 0 && !output) return null

  const labelClass = dark
    ? 'text-[9px] font-[500] uppercase tracking-[0.1em] text-white/30'
    : 'text-[9px] font-[500] uppercase tracking-[0.1em] text-[var(--c-gray-400)]'

  return (
    <div className="flex flex-col gap-3">
      {domains.length > 0 && (
        <div>
          <div className={`${labelClass} mb-1.5`}>Domains</div>
          <div className="flex flex-wrap gap-1.5">
            {domains.map((d) => (
              <span
                key={d}
                className={`px-3 py-1 rounded-[var(--radius-sm)] text-[11px] font-[450] ${
                  dark
                    ? 'bg-white/10 text-white/70'
                    : 'bg-[var(--c-gray-900)] text-white'
                }`}
              >
                {d}
              </span>
            ))}
          </div>
        </div>
      )}

      {services.length > 0 && (
        <div>
          <div className={`${labelClass} mb-1.5`}>Services</div>
          <div className="flex flex-wrap gap-1.5">
            {services.map((s) => (
              <span
                key={s}
                className={`px-3 py-1 rounded-[var(--radius-sm)] text-[11px] font-[400] ${
                  dark
                    ? 'border border-white/20 text-white/50'
                    : 'border border-[var(--c-gray-300)] text-[var(--c-gray-500)]'
                }`}
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {output && (
        <div>
          <div className={`${labelClass} mb-1.5`}>Category</div>
          <div className="flex flex-wrap gap-1.5">
            <span className={`px-3 py-1 rounded-[var(--radius-sm)] text-[11px] font-[400] ${
              dark
                ? 'bg-white/10 text-white/50'
                : 'bg-[var(--c-gray-100)] text-[var(--c-gray-500)]'
            }`}>
              {output}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
