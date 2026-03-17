'use client'

import { useProjectStore } from '@/stores/project-store'
import { useFilterOptions } from '@/hooks/use-filters'

export function Sidebar() {
  const { filters, setFilter } = useProjectStore()
  const options = useFilterOptions()

  return (
    <div className="w-[var(--sidebar-w)] h-full overflow-y-auto bg-[var(--c-gray-50)] px-[32px] py-[32px]">
      <h3 className="text-[10px] font-[500] uppercase tracking-[0.1em] text-[var(--c-gray-400)] mb-5">
        Filters
      </h3>

      <FilterSection
        title="Unit"
        options={options.sections}
        selected={filters.section}
        onChange={(v) => setFilter('section', v)}
      />

      <FilterSection
        title="Domains"
        options={options.domains}
        selected={filters.domains}
        onChange={(v) => setFilter('domains', v)}
      />

      <FilterSection
        title="Services"
        options={options.services}
        selected={filters.services}
        onChange={(v) => setFilter('services', v)}
      />

      <FilterSection
        title="Output"
        options={options.outputs}
        selected={filters.output}
        onChange={(v) => setFilter('output', v)}
      />

      <FilterSection
        title="Tier"
        options={['1', '2', '3']}
        selected={filters.tier.map(String)}
        onChange={(v) => setFilter('tier', v.map(Number))}
      />
    </div>
  )
}

interface FilterSectionProps {
  title: string
  options: string[]
  selected: string[]
  onChange: (selected: string[]) => void
}

function FilterSection({ title, options, selected, onChange }: FilterSectionProps) {
  const toggle = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter((s) => s !== option))
    } else {
      onChange([...selected, option])
    }
  }

  return (
    <div className="mb-6">
      <h4 className="text-[10px] font-[500] uppercase tracking-[0.06em] text-[var(--c-gray-500)] mb-2.5">{title}</h4>
      <div className="flex flex-col gap-0.5 max-h-40 overflow-y-auto">
        {options.map((option) => (
          <label
            key={option}
            className="flex items-center gap-2.5 text-[12px] cursor-pointer hover:text-[var(--c-gray-900)] px-1 py-1.5 transition-colors duration-150"
          >
            <input
              type="checkbox"
              checked={selected.includes(option)}
              onChange={() => toggle(option)}
              className="w-3.5 h-3.5 rounded-[2px] border-[var(--c-gray-300)] text-[var(--c-gray-900)] focus:ring-[var(--c-gray-400)] focus:ring-1"
            />
            <span className={`${selected.includes(option) ? 'text-[var(--c-gray-900)] font-[500]' : 'text-[var(--c-gray-600)] font-[400]'} truncate`}>
              {option}
            </span>
          </label>
        ))}
      </div>
    </div>
  )
}
