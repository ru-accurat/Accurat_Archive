import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export interface TeamMemberSummary {
  name: string
  projectCount: number
  domains: string[]
  services: string[]
  firstYear: number | null
  lastYear: number | null
}

export async function GET() {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('projects')
    .select('team, domains, services, start_year, end_year')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const map = new Map<string, {
    display: string
    projectCount: number
    domains: Map<string, number>
    services: Map<string, number>
    firstYear: number | null
    lastYear: number | null
  }>()

  for (const row of (data || []) as Array<{
    team: string[] | null
    domains: string[] | null
    services: string[] | null
    start_year: number | null
    end_year: number | null
  }>) {
    const team = row.team || []
    const year = row.end_year ?? row.start_year
    for (const raw of team) {
      const name = (raw || '').trim()
      if (!name) continue
      const key = name.toLowerCase()
      let entry = map.get(key)
      if (!entry) {
        entry = {
          display: name,
          projectCount: 0,
          domains: new Map(),
          services: new Map(),
          firstYear: null,
          lastYear: null,
        }
        map.set(key, entry)
      }
      entry.projectCount++
      for (const d of row.domains || []) {
        entry.domains.set(d, (entry.domains.get(d) || 0) + 1)
      }
      for (const s of row.services || []) {
        entry.services.set(s, (entry.services.get(s) || 0) + 1)
      }
      if (row.start_year != null) {
        entry.firstYear = entry.firstYear == null ? row.start_year : Math.min(entry.firstYear, row.start_year)
      }
      if (year != null) {
        entry.lastYear = entry.lastYear == null ? year : Math.max(entry.lastYear, year)
      }
    }
  }

  const members: TeamMemberSummary[] = Array.from(map.values())
    .map(e => ({
      name: e.display,
      projectCount: e.projectCount,
      domains: Array.from(e.domains.entries()).sort((a, b) => b[1] - a[1]).map(([k]) => k),
      services: Array.from(e.services.entries()).sort((a, b) => b[1] - a[1]).map(([k]) => k),
      firstYear: e.firstYear,
      lastYear: e.lastYear,
    }))
    .sort((a, b) => b.projectCount - a.projectCount || a.name.localeCompare(b.name))

  return NextResponse.json(members)
}
