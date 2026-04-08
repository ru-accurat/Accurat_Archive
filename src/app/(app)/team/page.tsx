import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

interface TeamMember {
  name: string
  projectCount: number
  domains: string[]
  services: string[]
  firstYear: number | null
  lastYear: number | null
}

async function fetchTeam(): Promise<TeamMember[]> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('projects')
    .select('team, domains, services, start_year, end_year')

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

  return Array.from(map.values())
    .map(e => ({
      name: e.display,
      projectCount: e.projectCount,
      domains: Array.from(e.domains.entries()).sort((a, b) => b[1] - a[1]).map(([k]) => k),
      services: Array.from(e.services.entries()).sort((a, b) => b[1] - a[1]).map(([k]) => k),
      firstYear: e.firstYear,
      lastYear: e.lastYear,
    }))
    .sort((a, b) => b.projectCount - a.projectCount || a.name.localeCompare(b.name))
}

export default async function TeamPage() {
  const members = await fetchTeam()
  const totalProjects = members.reduce((s, m) => s + m.projectCount, 0)

  return (
    <div className="h-full overflow-y-auto bg-[var(--c-white)]">
      <div className="max-w-[1200px] px-4 sm:px-6 md:px-[48px] py-10 mx-auto">
        <div className="mb-8">
          <h1 className="text-[1.4rem] font-[300] tracking-[-0.02em] text-[var(--c-gray-900)]">Team</h1>
          <p className="text-[11px] text-[var(--c-gray-400)] mt-1">
            {members.length} contributor{members.length === 1 ? '' : 's'} across {totalProjects} project credit{totalProjects === 1 ? '' : 's'}
          </p>
        </div>

        {members.length === 0 ? (
          <div className="text-[12px] text-[var(--c-gray-400)]">No team members found.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {members.map((m) => {
              const yearRange = m.firstYear && m.lastYear
                ? m.firstYear === m.lastYear ? `${m.firstYear}` : `${m.firstYear}–${m.lastYear}`
                : m.firstYear || m.lastYear || '—'
              const topDomains = m.domains.slice(0, 3)
              return (
                <Link
                  key={m.name}
                  href={`/team/${encodeURIComponent(m.name)}`}
                  className="group block border border-[var(--c-gray-100)] rounded-[var(--radius-sm)] p-4 hover:border-[var(--c-gray-300)] hover:bg-[var(--c-gray-50)]/40 transition-colors"
                >
                  <div className="flex items-baseline justify-between gap-3 mb-2">
                    <h3 className="text-[13px] font-[500] text-[var(--c-gray-900)] truncate group-hover:text-[var(--c-gray-900)]">
                      {m.name}
                    </h3>
                    <span className="text-[11px] tabular-nums text-[var(--c-gray-500)] shrink-0">
                      {m.projectCount} project{m.projectCount === 1 ? '' : 's'}
                    </span>
                  </div>
                  <div className="text-[10px] text-[var(--c-gray-400)] mb-2">{yearRange}</div>
                  {topDomains.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {topDomains.map(d => (
                        <span
                          key={d}
                          className="text-[9px] px-1.5 py-0.5 rounded-full bg-[var(--c-gray-100)] text-[var(--c-gray-500)]"
                        >
                          {d}
                        </span>
                      ))}
                    </div>
                  )}
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
