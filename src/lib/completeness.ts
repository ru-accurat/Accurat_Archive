import type { Project, ProjectSummary } from './types'

const SCORED_FIELDS = [
  'tagline',
  'description',
  'challenge',
  'solution',
  'deliverables',
  'clientQuotes',
  'team',
  'urls',
  'domains',
  'services'
] as const

type ScoredField = (typeof SCORED_FIELDS)[number]

export interface CompletenessResult {
  score: number
  total: number
  percentage: number
  missing: string[]
}

export function getCompleteness(project: Project): CompletenessResult {
  const missing: string[] = []

  for (const field of SCORED_FIELDS) {
    const val = project[field as keyof Project]
    const isEmpty = Array.isArray(val) ? val.length === 0 : !val || (val as string).trim() === ''

    if (isEmpty) {
      missing.push(field)
    }
  }

  const filled = SCORED_FIELDS.length - missing.length

  return {
    score: filled,
    total: SCORED_FIELDS.length,
    percentage: Math.round((filled / SCORED_FIELDS.length) * 100),
    missing
  }
}

/**
 * Compute completeness from a ProjectSummary using its precomputed `completeness` number.
 * We don't have access to the missing field names in summaries, so `missing` is empty.
 * Use this in list views where we only need the percentage.
 */
export function getCompletenessFromSummary(project: ProjectSummary): CompletenessResult {
  const filled = project.completeness
  const total = SCORED_FIELDS.length
  return {
    score: filled,
    total,
    percentage: Math.round((filled / total) * 100),
    missing: [],
  }
}

export function fieldLabel(field: string): string {
  const labels: Record<string, string> = {
    tagline: 'Tagline',
    description: 'Description',
    challenge: 'Challenge',
    solution: 'Solution',
    deliverables: 'Deliverables',
    clientQuotes: 'Client Quotes',
    team: 'Team',
    urls: 'URLs',
    domains: 'Domains',
    services: 'Services'
  }
  return labels[field] || field
}
