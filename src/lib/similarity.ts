import type { Project } from './types'

function levenshtein(a: string, b: string): number {
  const matrix: number[][] = []

  for (let i = 0; i <= b.length; i++) matrix[i] = [i]
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b[i - 1] === a[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }

  return matrix[b.length][a.length]
}

function similarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length)
  if (maxLen === 0) return 1
  return 1 - levenshtein(a, b) / maxLen
}

/** Score how similar two projects are (for finding related projects / few-shot examples) */
export function scoreSimilarity(a: Project, b: Project): number {
  let score = 0
  if (a.client === b.client) score += 4
  for (const d of a.domains) { if (b.domains.includes(d)) score += 3 }
  for (const s of a.services) { if (b.services.includes(s)) score += 2 }
  if (a.output === b.output && a.output) score += 1
  if (a.section === b.section && a.section) score += 1
  return score
}

export interface DuplicatePair {
  a: Project
  b: Project
  score: number
}

export function findDuplicates(projects: Project[], threshold = 0.85): DuplicatePair[] {
  const duplicates: DuplicatePair[] = []

  for (let i = 0; i < projects.length; i++) {
    for (let j = i + 1; j < projects.length; j++) {
      const a = projects[i]
      const b = projects[j]

      const nameA = `${a.client} ${a.projectName}`.toLowerCase().trim()
      const nameB = `${b.client} ${b.projectName}`.toLowerCase().trim()

      const score = similarity(nameA, nameB)
      if (score >= threshold) {
        duplicates.push({ a, b, score })
      }
    }
  }

  return duplicates.sort((a, b) => b.score - a.score)
}
