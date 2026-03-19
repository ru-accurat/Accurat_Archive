'use client'

import { useMemo } from 'react'
import { useProjectStore, type Filters } from '@/stores/project-store'
import type { Project } from '@/lib/types'

function matchesSearch(project: Project, search: string): boolean {
  if (!search) return true
  const lower = search.toLowerCase()
  return (
    project.client.toLowerCase().includes(lower) ||
    project.projectName.toLowerCase().includes(lower) ||
    project.fullName.toLowerCase().includes(lower) ||
    project.description.toLowerCase().includes(lower) ||
    project.tagline.toLowerCase().includes(lower) ||
    project.output.toLowerCase().includes(lower) ||
    project.domains.some((d) => d.toLowerCase().includes(lower)) ||
    project.services.some((s) => s.toLowerCase().includes(lower)) ||
    project.team.some((t) => t.toLowerCase().includes(lower))
  )
}

function matchesFilters(project: Project, filters: Filters): boolean {
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

  if (filters.missing.length > 0) {
    const hasDescription = !!project.description
    const hasMedia = !!(project.mediaOrder && project.mediaOrder.length > 0)

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

function sortProjects(projects: Project[], field: string, direction: 'asc' | 'desc'): Project[] {
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
        aVal = getQuickCompleteness(a)
        bVal = getQuickCompleteness(b)
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

function getQuickCompleteness(p: Project): number {
  let score = 0
  if (p.tagline) score++
  if (p.description) score++
  if (p.challenge) score++
  if (p.solution) score++
  if (p.deliverables) score++
  if (p.clientQuotes) score++
  if (p.team.length > 0) score++
  if (p.urls.length > 0) score++
  if (p.domains.length > 0) score++
  if (p.services.length > 0) score++
  return score
}

export function useFilteredProjects() {
  const { projects, filters, sortField, sortDirection } = useProjectStore()

  return useMemo(() => {
    const filtered = projects
      .filter((p) => matchesSearch(p, filters.search))
      .filter((p) => matchesFilters(p, filters))

    return sortProjects(filtered, sortField, sortDirection)
  }, [projects, filters, sortField, sortDirection])
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
