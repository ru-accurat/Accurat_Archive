import type { Client, ClientMatch } from './types'

/** Normalize: lowercase, strip spaces/hyphens/punctuation */
function normalize(s: string): string {
  return s.toLowerCase().replace(/[\s\-_.,;:'"()/\\]/g, '')
}

/** Simple Levenshtein distance */
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  )
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[m][n]
}

/**
 * Match a list of raw client names against existing canonical clients.
 * Returns one ClientMatch per unique input name.
 */
export function matchClients(rawNames: string[], clients: Client[]): ClientMatch[] {
  // Build normalized lookup: normalized name -> Client
  const normalizedMap = new Map<string, Client>()
  for (const c of clients) {
    normalizedMap.set(normalize(c.name), c)
    for (const alias of c.aliases) {
      normalizedMap.set(normalize(alias), c)
    }
  }

  const seen = new Set<string>()
  const results: ClientMatch[] = []

  for (const raw of rawNames) {
    if (seen.has(raw)) continue
    seen.add(raw)

    const norm = normalize(raw)

    // 1. Exact normalized match
    const exact = normalizedMap.get(norm)
    if (exact) {
      results.push({ original: raw, matchedClient: exact, confidence: 'exact' })
      continue
    }

    // 2. Fuzzy match: find closest client with distance ≤ 3 and length ratio > 0.7
    let bestClient: Client | null = null
    let bestDist = Infinity

    for (const c of clients) {
      const cNorm = normalize(c.name)
      const ratio = Math.min(norm.length, cNorm.length) / Math.max(norm.length, cNorm.length)
      if (ratio < 0.7) continue

      const dist = levenshtein(norm, cNorm)
      if (dist <= 3 && dist < bestDist) {
        bestDist = dist
        bestClient = c
      }

      // Also check aliases
      for (const alias of c.aliases) {
        const aNorm = normalize(alias)
        const aRatio = Math.min(norm.length, aNorm.length) / Math.max(norm.length, aNorm.length)
        if (aRatio < 0.7) continue
        const aDist = levenshtein(norm, aNorm)
        if (aDist <= 3 && aDist < bestDist) {
          bestDist = aDist
          bestClient = c
        }
      }
    }

    if (bestClient) {
      results.push({ original: raw, matchedClient: bestClient, confidence: 'fuzzy' })
    } else {
      results.push({ original: raw, matchedClient: null, confidence: 'none' })
    }
  }

  return results
}
