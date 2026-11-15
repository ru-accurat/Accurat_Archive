/** Partners are stored as a text[] (projects.partners). The editors show them as one
 * comma-separated string; this turns that string back into a clean, de-duplicated list. */
export function parsePartners(value: string): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of value.split(',')) {
    const name = raw.trim()
    if (name && !seen.has(name.toLowerCase())) {
      seen.add(name.toLowerCase())
      out.push(name)
    }
  }
  return out
}
