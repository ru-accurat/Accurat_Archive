'use client'

import { useEffect, useRef } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useProjectStore, type Filters } from '@/stores/project-store'
import { useUiStore } from '@/stores/ui-store'

// Default filters mirror the store. Anything matching the default is NOT serialized.
const DEFAULT_STATUS = ['internal', 'public']

function arraysEqual(a: string[], b: string[]) {
  if (a.length !== b.length) return false
  const sortedA = [...a].sort()
  const sortedB = [...b].sort()
  return sortedA.every((v, i) => v === sortedB[i])
}

/**
 * Convert the current store state to a URLSearchParams object.
 * Only non-default values are included.
 */
export function serializeState(
  filters: Filters,
  sortField: string,
  sortDirection: 'asc' | 'desc',
  viewMode: 'table' | 'grid'
): URLSearchParams {
  const params = new URLSearchParams()

  if (filters.search) params.set('q', filters.search)
  if (filters.domains.length > 0) params.set('domains', filters.domains.join(','))
  if (filters.services.length > 0) params.set('services', filters.services.join(','))
  if (filters.output.length > 0) params.set('output', filters.output.join(','))
  if (filters.section.length > 0) params.set('section', filters.section.join(','))
  if (filters.tier.length > 0) params.set('tier', filters.tier.map(String).join(','))
  if (filters.missing.length > 0) params.set('missing', filters.missing.join(','))
  if (!arraysEqual(filters.status, DEFAULT_STATUS)) {
    params.set('status', filters.status.join(','))
  }
  if (filters.yearRange[0] != null) params.set('from', String(filters.yearRange[0]))
  if (filters.yearRange[1] != null) params.set('to', String(filters.yearRange[1]))

  // Sort: default is client/asc — only serialize if changed
  if (sortField !== 'client' || sortDirection !== 'asc') {
    params.set('sort', sortField)
    if (sortDirection !== 'asc') params.set('dir', sortDirection)
  }

  // View mode: default is grid — only serialize if table
  if (viewMode !== 'grid') params.set('view', viewMode)

  return params
}

/**
 * Convert URL search params back into a partial state object.
 * Returns the values to apply to the store.
 */
export function deserializeState(searchParams: URLSearchParams): {
  filters: Partial<Filters>
  sortField?: string
  sortDirection?: 'asc' | 'desc'
  viewMode?: 'table' | 'grid'
} {
  const filters: Partial<Filters> = {}

  const q = searchParams.get('q')
  if (q != null) filters.search = q

  const domains = searchParams.get('domains')
  if (domains) filters.domains = domains.split(',').filter(Boolean)

  const services = searchParams.get('services')
  if (services) filters.services = services.split(',').filter(Boolean)

  const output = searchParams.get('output')
  if (output) filters.output = output.split(',').filter(Boolean)

  const section = searchParams.get('section')
  if (section) filters.section = section.split(',').filter(Boolean)

  const tier = searchParams.get('tier')
  if (tier) filters.tier = tier.split(',').map((v) => parseInt(v, 10)).filter((v) => !isNaN(v))

  const missing = searchParams.get('missing')
  if (missing) filters.missing = missing.split(',').filter(Boolean)

  const status = searchParams.get('status')
  if (status) filters.status = status.split(',').filter(Boolean)

  const from = searchParams.get('from')
  const to = searchParams.get('to')
  if (from != null || to != null) {
    filters.yearRange = [
      from != null ? parseInt(from, 10) : null,
      to != null ? parseInt(to, 10) : null,
    ]
  }

  const result: ReturnType<typeof deserializeState> = { filters }

  const sort = searchParams.get('sort')
  if (sort) result.sortField = sort

  const dir = searchParams.get('dir')
  if (dir === 'asc' || dir === 'desc') result.sortDirection = dir

  const view = searchParams.get('view')
  if (view === 'table' || view === 'grid') result.viewMode = view

  return result
}

/**
 * Two-way sync between the URL and the project store.
 *
 * - On mount: read URL → write to store
 * - On store change: write store → URL (debounced 200ms, replaceState)
 *
 * Defaults are not serialized to keep URLs clean.
 */
export function useUrlFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const { filters, sortField, sortDirection, setFilter, setSearch, setSort } = useProjectStore()
  const { viewMode, setViewMode } = useUiStore()

  const hasHydratedRef = useRef(false)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── 1. Hydrate store from URL on first mount ───────────────────────
  useEffect(() => {
    if (hasHydratedRef.current) return
    hasHydratedRef.current = true

    const parsed = deserializeState(new URLSearchParams(searchParams.toString()))

    // Apply filters
    if (parsed.filters.search != null) setSearch(parsed.filters.search)
    if (parsed.filters.domains) setFilter('domains', parsed.filters.domains)
    if (parsed.filters.services) setFilter('services', parsed.filters.services)
    if (parsed.filters.output) setFilter('output', parsed.filters.output)
    if (parsed.filters.section) setFilter('section', parsed.filters.section)
    if (parsed.filters.tier) setFilter('tier', parsed.filters.tier)
    if (parsed.filters.missing) setFilter('missing', parsed.filters.missing)
    if (parsed.filters.status) setFilter('status', parsed.filters.status)
    if (parsed.filters.yearRange) setFilter('yearRange', parsed.filters.yearRange)

    if (parsed.sortField) setSort(parsed.sortField, parsed.sortDirection || 'asc')
    if (parsed.viewMode) setViewMode(parsed.viewMode)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── 2. Subscribe to store and update URL (debounced) ──────────────
  useEffect(() => {
    if (!hasHydratedRef.current) return

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)

    debounceTimerRef.current = setTimeout(() => {
      const params = serializeState(filters, sortField, sortDirection, viewMode)
      const queryString = params.toString()
      const url = queryString ? `${pathname}?${queryString}` : pathname
      router.replace(url, { scroll: false })
    }, 200)

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    }
  }, [filters, sortField, sortDirection, viewMode, pathname, router])
}
