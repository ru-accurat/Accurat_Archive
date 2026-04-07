'use client'

import { useMemo } from 'react'
import Fuse, { type IFuseOptions } from 'fuse.js'
import { useProjectStore, type Filters } from '@/stores/project-store'
import type { ProjectSummary } from '@/lib/types'

const FUSE_KEYS: IFuseOptions<ProjectSummary>['keys'] = [
  'client',
  'projectName',
  'fullName',
  'tagline',
  'description',
  'output',
  'domains',
  'services',
  'team',
]

const FUSE_OPTIONS: IFuseOptions<ProjectSummary> = {
  keys: FUSE_KEYS,
  threshold: 0.3,
  ignoreLocation: true,
  includeMatches: true,
  minMatchCharLength: 2,
}

function matchesFilters(project: ProjectSummary, filters: Filters): boolean {
  if (filters.domains.length > 0) {
    if (!filters.domains.some((d) => project.domains.includes(d))) return false
  }
  if (filters.services.length > 0) {
    if (!filters.services.some((s) => project.services.includes(s))) return false
  }
  if (filters.output.length > 0) {
    if (!filters.output.includes(project.output)) return false
  }
  if (filters.section.length > 0) {
    if (!filters.section.some((s) => project.section.includes(s))) return false
  }
  if (filters.tier.length > 0) {
    if (!filters.tier.includes(project.tier)) return false
  }
  const [minYear, maxYear] = filters.yearRange
  if (minYear && project.start && project.start < minYear) return false
  if (maxYear && project.start && project.start > maxYear) return false

  if (filters.status.length > 0) {
    if (!filters.status.includes(project.status)) return false
  }

  if (filters.missing.length > 0) {
    const hasDescription = !!project.description
    const hasMedia = project.hasMedia

    // Each selected filter is OR'd — project must match at least one
    const matchesAny = filters.missing.some((m) => {
      if (m === 'Missing Description') return !hasDescription
      if (m === 'Missing Media') return !hasMedia
      if (m === 'Complete') return hasDescription && hasMedia
      return false
    })
    if (!matchesAny) return false
  }

  return true
}

function sortProjects(projects: ProjectSummary[], field: string, direction: 'asc' | 'desc'): ProjectSummary[] {
  const sorted = [...projects].sort((a, b) => {
    let aVal: string | number | null = ''
    let bVal: string | number | null = ''

    switch (field) {
      case 'client':
        aVal = a.client.toLowerCase()
        bVal = b.client.toLowerCase()
        break
      case 'projectName':
        aVal = a.projectName.toLowerCase()
        bVal = b.projectName.toLowerCase()
        break
      case 'year':
        aVal = a.start || 0
        bVal = b.start || 0
        break
      case 'output':
        aVal = a.output.toLowerCase()
        bVal = b.output.toLowerCase()
        break
      case 'section':
        aVal = a.section.toLowerCase()
        bVal = b.section.toLowerCase()
        break
      case 'tier':
        aVal = a.tier
        bVal = b.tier
        break
      case 'completeness':
        aVal = a.completeness
        bVal = b.completeness
        break
      default:
        aVal = a.client.toLowerCase()
        bVal = b.client.toLowerCase()
    }

    if (aVal < bVal) return -1
    if (aVal > bVal) return 1
    return 0
  })

  return direction === 'desc' ? sorted.reverse() : sorted
}

function useFuse(projects: ProjectSummary[]) {
  return useMemo(() => new Fuse(projects, FUSE_OPTIONS), [projects])
}

function searchProjects(
  projects: ProjectSummary[],
  fuse: Fuse<ProjectSummary>,
  search: string
): { results: ProjectSummary[]; matches: Map<string, string> } {
  if (!search) return { results: projects, matches: new Map() }
  const hits = fuse.search(search)
  const matches = new Map<string, string>()
  const results: ProjectSummary[] = []
  for (const hit of hits) {
    results.push(hit.item)
    const first = hit.matches?.[0]
    if (first?.key) matches.set(hit.item.id, first.key)
  }
  return { results, matches }
}

export function useFilteredProjects() {
  const { projects, filters, sortField, sortDirection } = useProjectStore()
  const fuse = useFuse(projects)

  return useMemo(() => {
    const { results } = searchProjects(projects, fuse, filters.search)
    const filtered = results.filter((p) => matchesFilters(p, filters))
    return sortProjects(filtered, sortField, sortDirection)
  }, [projects, fuse, filters, sortField, sortDirection])
}

export function useFilteredProjectsWithMatches(): {
  projects: ProjectSummary[]
  matches: Map<string, string>
} {
  const { projects, filters, sortField, sortDirection } = useProjectStore()
  const fuse = useFuse(projects)

  return useMemo(() => {
    const { results, matches } = searchProjects(projects, fuse, filters.search)
    const filtered = results.filter((p) => matchesFilters(p, filters))
    const sorted = sortProjects(filtered, sortField, sortDirection)
    return { projects: sorted, matches }
  }, [projects, fuse, filters, sortField, sortDirection])
}

export function useFilterOptions() {
  const projects = useProjectStore((s) => s.projects)

  return useMemo(() => {
    const domains = new Set<string>()
    const services = new Set<string>()
    const outputs = new Set<string>()
    const sections = new Set<string>()
    const years: number[] = []

    for (const p of projects) {
      p.domains.forEach((d) => domains.add(d))
      p.services.forEach((s) => services.add(s))
      if (p.output) outputs.add(p.output)
      if (p.section) sections.add(p.section)
      if (p.start) years.push(p.start)
    }

    return {
      domains: [...domains].sort(),
      services: [...services].sort(),
      outputs: [...outputs].sort(),
      sections: [...sections].sort(),
      yearRange: years.length > 0 ? [Math.min(...years), Math.max(...years)] as [number, number] : [2011, 2026] as [number, number]
    }
  }, [projects])
}
