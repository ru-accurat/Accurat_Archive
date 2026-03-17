'use client'

import { useState } from 'react'
import { useProjectStore } from '@/stores/project-store'
import { useFilterOptions } from '@/hooks/use-filters'

interface FilterDef {
  key: string
  label: string
  storeKey: 'section' | 'domains' | 'services' | 'output' | 'tier' | 'missing'
  options: string[]
  selected: string[]
  onChange: (v: string[]) => void
}

export function FilterAccordion() {
  const { filters, setFilter } = useProjectStore()
  const options = useFilterOptions()
  const [openSection, setOpenSection] = useState<string | null>(null)

  const defs: FilterDef[] = [
    {
      key: 'section',
      label: 'Unit',
      storeKey: 'section',
      options: options.sections,
      selected: filters.section,
      onChange: (v) => setFilter('section', v)
    },
    {
      key: 'domains',
      label: 'Domains',
      storeKey: 'domains',
      options: options.domains,
      selected: filters.domains,
      onChange: (v) => setFilter('domains', v)
    },
    {
      key: 'services',
      label: 'Services',
      storeKey: 'services',
      options: options.services,
      selected: filters.services,
      onChange: (v) => setFilter('services', v)
    },
    {
      key: 'output',
      label: 'Category',
      storeKey: 'output',
      options: options.outputs,
      selected: filters.output,
      onChange: (v) => setFilter('output', v)
    },
    {
      key: 'tier',
      label: 'Tier',
      storeKey: 'tier',
      options: ['1', '2', '3'],
      selected: filters.tier.map(String),
      onChange: (v) => setFilter('tier', v.map(Number))
    },
    {
      key: 'missing',
      label: 'Missing',
      storeKey: 'missing',
      options: ['description', 'media'],
      selected: filters.missing,
      onChange: (v) => setFilter('missing', v)
    }
  ]

  const toggle = (key: string) => {
    setOpenSection(openSection === key ? null : key)
  }

  const toggleOption = (def: FilterDef, option: string) => {
    if (def.selected.includes(option)) {
      def.onChange(def.selected.filter((s) => s !== option))
    } else {
      def.onChange([...def.selected, option])
    }
  }

  return (
    <div style={{ paddingLeft: 48, paddingRight: 48 }}>
      {/* Category buttons row */}
      <div className="flex items-center gap-1.5 pb-2">
        {defs.map((def) => {
          const count = def.selected.length
          const isOpen = openSection === def.key
          return (
            <button
              key={def.key}
              onClick={() => toggle(def.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] text-[11px] font-[450] tracking-[0.02em] transition-all duration-150 ${
                isOpen
                  ? 'bg-[var(--c-gray-900)] text-white'
                  : count > 0
                    ? 'bg-[var(--c-gray-100)] text-[var(--c-gray-900)]'
                    : 'bg-transparent text-[var(--c-gray-500)] hover:bg-[var(--c-gray-50)] hover:text-[var(--c-gray-700)]'
              }`}
            >
              {def.label}
              {count > 0 && (
                <span
                  className={`inline-flex items-center justify-center min-w-[16px] h-[16px] rounded-full text-[9px] font-[600] ${
                    isOpen ? 'bg-white/20 text-white' : 'bg-[var(--c-gray-900)] text-white'
                  }`}
                >
                  {count}
                </span>
              )}
              <svg
                width="8"
                height="8"
                viewBox="0 0 8 8"
                fill="none"
                className={`transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}
              >
                <path d="M1.5 3L4 5.5L6.5 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )
        })}
      </div>

      {/* Expanded panel */}
      {openSection && (
        <div className="border-t border-[var(--c-gray-100)] pt-3 pb-3">
          {defs
            .filter((d) => d.key === openSection)
            .map((def) => (
              <div key={def.key} className="flex flex-wrap gap-1.5">
                {def.options.map((option) => {
                  const active = def.selected.includes(option)
                  return (
                    <button
                      key={option}
                      onClick={() => toggleOption(def, option)}
                      className={`px-3 py-1.5 rounded-[var(--radius-sm)] text-[11px] font-[400] transition-all duration-150 ${
                        active
                          ? 'bg-[var(--c-gray-900)] text-white'
                          : 'bg-[var(--c-gray-50)] text-[var(--c-gray-600)] hover:bg-[var(--c-gray-100)] hover:text-[var(--c-gray-900)]'
                      }`}
                    >
                      {option}
                    </button>
                  )
                })}
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
