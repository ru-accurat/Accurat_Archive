'use client'

import { useState } from 'react'
import type { SharedFilters } from '@/hooks/use-shared-filters'

interface FilterOption {
  key: keyof Omit<SharedFilters, 'search'>
  label: string
  values: string[]
}

interface CompactFilterBarProps {
  filters: SharedFilters
  options: {
    domains: string[]
    services: string[]
    outputs: string[]
    sections: string[]
  }
  onToggle: (key: keyof Omit<SharedFilters, 'search'>, value: string) => void
  onSearchChange: (search: string) => void
  onClear: () => void
  hasActiveFilters: boolean
  totalCount: number
  filteredCount: number
}

export function CompactFilterBar({
  filters,
  options,
  onToggle,
  onSearchChange,
  onClear,
  hasActiveFilters,
  totalCount,
  filteredCount,
}: CompactFilterBarProps) {
  const [expanded, setExpanded] = useState<string | null>(null)

  const filterGroups: FilterOption[] = [
    { key: 'section', label: 'Unit', values: options.sections },
    { key: 'domains', label: 'Domain', values: options.domains },
    { key: 'services', label: 'Service', values: options.services },
    { key: 'output', label: 'Category', values: options.outputs },
  ]

  return (
    <div className="border-b border-[var(--c-gray-100)]">
      <div className="flex items-center gap-3 px-4 sm:px-6 md:px-[48px] py-2">
        {/* Search */}
        <div className="relative">
          <svg className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--c-gray-400)]" viewBox="0 0 14 14" fill="none">
            <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.2" />
            <path d="M9.5 9.5L13 13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            placeholder="Search..."
            value={filters.search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="text-[11px] pl-7 pr-2 py-1.5 w-36 bg-transparent border border-[var(--c-gray-200)] rounded-[var(--radius-sm)] focus:outline-none focus:border-[var(--c-gray-400)] text-[var(--c-gray-700)]"
          />
        </div>

        {/* Filter buttons */}
        {filterGroups.map((group) => {
          const selected = (filters[group.key] as string[]) || []
          const isOpen = expanded === group.key
          return (
            <div key={group.key} className="relative">
              <button
                onClick={() => setExpanded(isOpen ? null : group.key)}
                className={`text-[10px] font-[450] px-2.5 py-1.5 rounded-[var(--radius-sm)] transition-colors ${
                  selected.length > 0
                    ? 'bg-[var(--c-gray-900)] text-white'
                    : isOpen
                      ? 'bg-[var(--c-gray-100)] text-[var(--c-gray-700)]'
                      : 'text-[var(--c-gray-500)] hover:bg-[var(--c-gray-50)]'
                }`}
              >
                {group.label}
                {selected.length > 0 && (
                  <span className="ml-1 text-[9px] bg-white/20 px-1 rounded">{selected.length}</span>
                )}
              </button>
              {isOpen && (
                <div className="absolute top-8 left-0 z-50 bg-[var(--c-white)] border border-[var(--c-gray-200)] rounded-[var(--radius-md)] shadow-lg p-2 min-w-[160px] max-h-[240px] overflow-y-auto">
                  {group.values.map((val) => {
                    const isSelected = selected.includes(val)
                    return (
                      <button
                        key={val}
                        onClick={() => onToggle(group.key, val)}
                        className={`block w-full text-left text-[11px] px-2.5 py-1.5 rounded-[var(--radius-sm)] transition-colors ${
                          isSelected
                            ? 'bg-[var(--c-gray-900)] text-white'
                            : 'text-[var(--c-gray-600)] hover:bg-[var(--c-gray-50)]'
                        }`}
                      >
                        {val}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}

        {/* Clear + count */}
        {hasActiveFilters && (
          <>
            <button
              onClick={onClear}
              className="text-[10px] text-[var(--c-gray-400)] hover:text-[var(--c-gray-700)] transition-colors"
            >
              Clear
            </button>
            <span className="text-[10px] text-[var(--c-gray-400)]">
              {filteredCount} of {totalCount}
            </span>
          </>
        )}
      </div>
    </div>
  )
}
