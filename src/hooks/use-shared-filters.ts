'use client'

import { useState, useMemo, useCallback } from 'react'
import type { ProjectSummary } from '@/lib/types'

export interface SharedFilters {
  search: string
  domains: string[]
  services: string[]
  output: string[]
  section: string[]
  status: string[]
}

const EMPTY_FILTERS: SharedFilters = {
  search: '',
  domains: [],
  services: [],
  output: [],
  section: [],
  status: [],
}

function matchesSearch(project: ProjectSummary, search: string): boolean {
  if (!search) return true
  const lower = search.toLowerCase()
  return (
    project.client.toLowerCase().includes(lower) ||
    project.projectName.toLowerCase().includes(lower) ||
    project.fullName.toLowerCase().includes(lower) ||
    project.domains.some((d) => d.toLowerCase().includes(lower)) ||
    project.services.some((s) => s.toLowerCase().includes(lower))
  )
}

function matchesFilters(project: ProjectSummary, filters: SharedFilters): boolean {
  if (filters.domains.length > 0 && !filters.domains.some((d) => project.domains.includes(d))) return false
  if (filters.services.length > 0 && !filters.services.some((s) => project.services.includes(s))) return false
  if (filters.output.length > 0 && !filters.output.includes(project.output)) return false
  if (filters.section.length > 0 && !filters.section.some((s) => project.section.includes(s))) return false
  if (filters.status.length > 0 && !filters.status.includes(project.status)) return false
  return true
}

export function useSharedFilters(projects: ProjectSummary[]) {
  const [filters, setFilters] = useState<SharedFilters>(EMPTY_FILTERS)

  const filtered = useMemo(
    () => projects.filter((p) => matchesSearch(p, filters.search) && matchesFilters(p, filters)),
    [projects, filters]
  )

  const options = useMemo(() => {
    const domains = new Set<string>()
    const services = new Set<string>()
    const outputs = new Set<string>()
    const sections = new Set<string>()
    for (const p of projects) {
      p.domains.forEach((d) => domains.add(d))
      p.services.forEach((s) => services.add(s))
      if (p.output) outputs.add(p.output)
      if (p.section) sections.add(p.section)
    }
    return {
      domains: [...domains].sort(),
      services: [...services].sort(),
      outputs: [...outputs].sort(),
      sections: [...sections].sort(),
    }
  }, [projects])

  const toggleFilter = useCallback((key: keyof Omit<SharedFilters, 'search'>, value: string) => {
    setFilters((prev) => {
      const arr = prev[key] as string[]
      return { ...prev, [key]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value] }
    })
  }, [])

  const setSearch = useCallback((search: string) => {
    setFilters((prev) => ({ ...prev, search }))
  }, [])

  const clearFilters = useCallback(() => {
    setFilters(EMPTY_FILTERS)
  }, [])

  const hasActiveFilters = !!(
    filters.search ||
    filters.domains.length ||
    filters.services.length ||
    filters.output.length ||
    filters.section.length ||
    filters.status.length
  )

  return { filters, filtered, options, toggleFilter, setSearch, clearFilters, hasActiveFilters }
}
