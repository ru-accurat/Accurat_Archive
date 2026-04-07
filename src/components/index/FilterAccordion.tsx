'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useProjectStore, type Filters } from '@/stores/project-store'
import { useUiStore } from '@/stores/ui-store'
import { useFilterOptions } from '@/hooks/use-filters'
import { api } from '@/lib/api-client'
import { toast } from '@/lib/toast'
import type { FilterPreset } from '@/lib/types'

interface FilterDef {
  key: string
  label: string
  storeKey: 'section' | 'domains' | 'services' | 'output' | 'tier' | 'missing' | 'status'
  options: string[]
  selected: string[]
  onChange: (v: string[]) => void
}

const DEFAULT_STATUS = ['internal', 'public']
const DEFAULT_FILTERS: Filters = {
  search: '',
  domains: [],
  services: [],
  output: [],
  section: [],
  yearRange: [null, null],
  tier: [],
  missing: [],
  status: DEFAULT_STATUS,
}

function isDefaultFilters(filters: Filters): boolean {
  return (
    !filters.search &&
    filters.domains.length === 0 &&
    filters.services.length === 0 &&
    filters.output.length === 0 &&
    filters.section.length === 0 &&
    filters.tier.length === 0 &&
    filters.missing.length === 0 &&
    filters.status.length === 2 &&
    filters.status.includes('internal') &&
    filters.status.includes('public') &&
    filters.yearRange[0] == null &&
    filters.yearRange[1] == null
  )
}

function isDraftsHidden(status: string[]): boolean {
  return status.length > 0 && !status.includes('draft')
}

export function FilterAccordion() {
  const { filters, setFilter, clearFilters, sortField, sortDirection, setSort, projects } = useProjectStore()
  const { viewMode, setViewMode } = useUiStore()
  const options = useFilterOptions()
  const [openSection, setOpenSection] = useState<string | null>(null)

  // Presets state
  const [presets, setPresets] = useState<FilterPreset[]>([])
  const [presetsOpen, setPresetsOpen] = useState(false)
  const [savingPreset, setSavingPreset] = useState(false)
  const [newPresetName, setNewPresetName] = useState('')
  const [showSaveInput, setShowSaveInput] = useState(false)
  const presetsRef = useRef<HTMLDivElement>(null)

  // Load presets once
  useEffect(() => {
    api.getFilterPresets()
      .then(setPresets)
      .catch(() => { /* user might not be authed yet */ })
  }, [])

  // Esc clears all filters when no input is focused
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      // Only fire if there's something to clear
      if (isDefaultFilters(filters)) return
      e.preventDefault()
      clearFilters()
      toast.info('Filters cleared')
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [filters, clearFilters])

  // Click outside to close presets dropdown
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (presetsRef.current && !presetsRef.current.contains(e.target as Node)) {
        setPresetsOpen(false)
        setShowSaveInput(false)
      }
    }
    if (presetsOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [presetsOpen])

  const showDrafts = useCallback(() => {
    setFilter('status', ['draft', 'internal', 'public'])
  }, [setFilter])

  const handleSavePreset = useCallback(async () => {
    if (!newPresetName.trim()) return
    setSavingPreset(true)
    try {
      const preset = await api.createFilterPreset({
        name: newPresetName.trim(),
        filters: {
          search: filters.search || undefined,
          domains: filters.domains.length ? filters.domains : undefined,
          services: filters.services.length ? filters.services : undefined,
          output: filters.output.length ? filters.output : undefined,
          section: filters.section.length ? filters.section : undefined,
          tier: filters.tier.length ? filters.tier : undefined,
          missing: filters.missing.length ? filters.missing : undefined,
          status: filters.status,
          yearRange: filters.yearRange[0] || filters.yearRange[1] ? filters.yearRange : undefined,
        },
        sortField,
        sortDirection,
        viewMode,
      })
      setPresets([preset, ...presets])
      setNewPresetName('')
      setShowSaveInput(false)
      setPresetsOpen(false)
      toast.success(`Preset "${preset.name}" saved`)
    } catch (err) {
      toast.error('Failed to save preset: ' + String(err))
    }
    setSavingPreset(false)
  }, [newPresetName, filters, sortField, sortDirection, viewMode, presets])

  const handleApplyPreset = useCallback((preset: FilterPreset) => {
    // Reset to defaults first
    clearFilters()
    // Apply preset values
    const f = preset.filters
    if (f.search) setFilter('search' as keyof Filters, f.search as never)
    if (f.domains) setFilter('domains', f.domains)
    if (f.services) setFilter('services', f.services)
    if (f.output) setFilter('output', f.output)
    if (f.section) setFilter('section', f.section)
    if (f.tier) setFilter('tier', f.tier)
    if (f.missing) setFilter('missing', f.missing)
    if (f.status) setFilter('status', f.status)
    if (f.yearRange) setFilter('yearRange', f.yearRange as [number | null, number | null])
    if (preset.sortField) setSort(preset.sortField, preset.sortDirection || 'asc')
    if (preset.viewMode) setViewMode(preset.viewMode)
    setPresetsOpen(false)
    toast.success(`Loaded preset "${preset.name}"`)
  }, [clearFilters, setFilter, setSort, setViewMode])

  const handleDeletePreset = useCallback(async (preset: FilterPreset, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm(`Delete preset "${preset.name}"?`)) return
    try {
      await api.deleteFilterPreset(preset.id)
      setPresets(presets.filter(p => p.id !== preset.id))
      toast.success('Preset deleted')
    } catch (err) {
      toast.error('Failed to delete preset: ' + String(err))
    }
  }, [presets])

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
      key: 'status',
      label: 'Status',
      storeKey: 'status',
      options: ['draft', 'internal', 'public'],
      selected: filters.status,
      onChange: (v) => setFilter('status', v)
    },
    {
      key: 'missing',
      label: 'Completion',
      storeKey: 'missing',
      options: ['Missing Description', 'Missing Media', 'Complete'],
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

  const draftsHidden = isDraftsHidden(filters.status)
  const draftsCount = projects.filter(p => p.status === 'draft').length

  return (
    <div className="px-4 sm:px-6 md:px-[48px]">
      {/* Default filter badge — drafts hidden notice */}
      {draftsHidden && draftsCount > 0 && (
        <div className="flex items-center gap-2 pb-2 text-[11px] text-[var(--c-gray-500)]">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2" />
            <path d="M6 3.5v3M6 8v.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
          <span>
            {draftsCount} draft project{draftsCount !== 1 ? 's' : ''} hidden
          </span>
          <button
            onClick={showDrafts}
            className="font-[450] text-[var(--c-gray-700)] hover:text-[var(--c-gray-900)] underline underline-offset-2 transition-colors"
          >
            Show drafts
          </button>
        </div>
      )}

      {/* Category buttons row */}
      <div className="flex items-center gap-1.5 pb-2 overflow-x-auto scrollbar-none">
        {defs.map((def) => {
          const count = def.selected.length
          const isOpen = openSection === def.key
          return (
            <button
              key={def.key}
              onClick={() => toggle(def.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] text-[11px] font-[450] tracking-[0.02em] transition-all duration-150 shrink-0 whitespace-nowrap ${
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

        {/* Spacer */}
        <div className="flex-1" />

        {/* Presets dropdown */}
        <div className="relative shrink-0" ref={presetsRef}>
          <button
            onClick={() => setPresetsOpen(!presetsOpen)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] text-[11px] font-[450] tracking-[0.02em] transition-all duration-150 whitespace-nowrap ${
              presetsOpen
                ? 'bg-[var(--c-gray-900)] text-white'
                : 'bg-transparent text-[var(--c-gray-500)] hover:bg-[var(--c-gray-50)] hover:text-[var(--c-gray-700)]'
            }`}
          >
            Presets
            <svg
              width="8"
              height="8"
              viewBox="0 0 8 8"
              fill="none"
              className={`transition-transform duration-150 ${presetsOpen ? 'rotate-180' : ''}`}
            >
              <path d="M1.5 3L4 5.5L6.5 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {presetsOpen && (
            <div className="absolute right-0 top-9 z-50 w-72 bg-[var(--c-white)] border border-[var(--c-gray-200)] rounded-[var(--radius-md)] shadow-lg py-1">
              {presets.length === 0 ? (
                <div className="px-3 py-2 text-[11px] text-[var(--c-gray-400)]">
                  No saved presets yet.
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto">
                  {presets.map((preset) => (
                    <div
                      key={preset.id}
                      onClick={() => handleApplyPreset(preset)}
                      className="group flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-[var(--c-gray-50)] transition-colors"
                    >
                      <span className="text-[12px] text-[var(--c-gray-800)] font-[450] truncate">
                        {preset.name}
                      </span>
                      <button
                        onClick={(e) => handleDeletePreset(preset, e)}
                        className="ml-2 text-[var(--c-gray-300)] hover:text-[var(--c-error)] transition-colors opacity-0 group-hover:opacity-100"
                        title="Delete preset"
                      >
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path d="M2.5 2.5l5 5M7.5 2.5l-5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-t border-[var(--c-gray-100)] mt-1 pt-1">
                {showSaveInput ? (
                  <div className="px-2 py-1 flex items-center gap-1">
                    <input
                      type="text"
                      value={newPresetName}
                      onChange={(e) => setNewPresetName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSavePreset()
                        if (e.key === 'Escape') { setShowSaveInput(false); setNewPresetName('') }
                      }}
                      placeholder="Preset name..."
                      autoFocus
                      className="flex-1 text-[11px] px-2 py-1 bg-[var(--c-gray-50)] border border-[var(--c-gray-200)] rounded-[var(--radius-sm)] focus:border-[var(--c-gray-400)] focus:outline-none"
                    />
                    <button
                      onClick={handleSavePreset}
                      disabled={!newPresetName.trim() || savingPreset}
                      className="text-[10px] font-[500] px-2 py-1 rounded-[var(--radius-sm)] bg-[var(--c-gray-900)] text-white hover:bg-[var(--c-gray-800)] transition-colors disabled:opacity-40"
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowSaveInput(true)}
                    disabled={isDefaultFilters(filters)}
                    className="w-full text-left px-3 py-2 text-[11px] text-[var(--c-gray-600)] hover:bg-[var(--c-gray-50)] hover:text-[var(--c-gray-900)] transition-colors disabled:text-[var(--c-gray-300)] disabled:cursor-not-allowed disabled:hover:bg-transparent"
                  >
                    + Save current as preset…
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
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
