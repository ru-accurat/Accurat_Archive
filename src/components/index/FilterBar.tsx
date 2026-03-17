'use client'

import { useProjectStore } from '@/stores/project-store'

export function FilterBar() {
  const { filters, setFilter, setSearch, clearFilters } = useProjectStore()

  const activeCount =
    filters.domains.length +
    filters.services.length +
    filters.output.length +
    filters.section.length +
    filters.tier.length +
    filters.missing.length +
    (filters.yearRange[0] !== null ? 1 : 0)

  if (activeCount === 0 && !filters.search) return null

  return (
    <div className="flex items-center gap-2 px-[48px] py-2.5">
      <span className="text-[10px] font-[500] uppercase tracking-[0.06em] text-[var(--c-gray-400)]">Active:</span>

      {filters.search && (
        <Chip label={`"${filters.search}"`} onRemove={() => setSearch('')} />
      )}

      {filters.domains.map((d) => (
        <Chip
          key={d}
          label={d}
          onRemove={() => setFilter('domains', filters.domains.filter((x) => x !== d))}
        />
      ))}

      {filters.services.map((s) => (
        <Chip
          key={s}
          label={s}
          onRemove={() => setFilter('services', filters.services.filter((x) => x !== s))}
        />
      ))}

      {filters.output.map((o) => (
        <Chip
          key={o}
          label={o}
          onRemove={() => setFilter('output', filters.output.filter((x) => x !== o))}
        />
      ))}

      {filters.section.map((s) => (
        <Chip
          key={s}
          label={s}
          onRemove={() => setFilter('section', filters.section.filter((x) => x !== s))}
        />
      ))}

      {filters.missing.map((m) => (
        <Chip
          key={`missing-${m}`}
          label={`Missing ${m}`}
          onRemove={() => setFilter('missing', filters.missing.filter((x) => x !== m))}
        />
      ))}

      {activeCount > 1 && (
        <button
          onClick={clearFilters}
          className="text-[11px] font-[450] text-[var(--c-gray-500)] hover:text-[var(--c-gray-900)] ml-1 transition-colors duration-200"
        >
          Clear all
        </button>
      )}
    </div>
  )
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-sm)] bg-[var(--c-gray-900)] text-white text-[11px] font-[400]">
      {label}
      <button onClick={onRemove} className="text-white/50 hover:text-white transition-colors duration-150">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2.5 2.5l5 5M7.5 2.5l-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
      </button>
    </span>
  )
}
