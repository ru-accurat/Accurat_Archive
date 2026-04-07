import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { rowToProject, type ProjectRow } from '@/lib/db-utils'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name: rawName } = await params
  const name = decodeURIComponent(rawName).trim()
  if (!name) return NextResponse.json({ error: 'Missing name' }, { status: 400 })

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .contains('team', [name])

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Case-insensitive filter (contains is case-sensitive)
  const lower = name.toLowerCase()
  const { data: allProjects, error: allErr } = !data || data.length === 0
    ? await supabase.from('projects').select('*')
    : { data: null as ProjectRow[] | null, error: null }

  if (allErr) {
    return NextResponse.json({ error: allErr.message }, { status: 500 })
  }

  const source = (data && data.length > 0 ? data : allProjects || []) as ProjectRow[]
  const matched = source.filter(row =>
    (row.team || []).some(t => (t || '').trim().toLowerCase() === lower)
  )

  // Get canonical display name (first matching spelling)
  let displayName = name
  for (const row of matched) {
    const found = (row.team || []).find(t => (t || '').trim().toLowerCase() === lower)
    if (found) { displayName = found.trim(); break }
  }

  const projects = matched.map(rowToProject)

  // Stats
  const domainCounts = new Map<string, number>()
  const serviceCounts = new Map<string, number>()
  let firstYear: number | null = null
  let lastYear: number | null = null

  for (const p of projects) {
    for (const d of p.domains || []) domainCounts.set(d, (domainCounts.get(d) || 0) + 1)
    for (const s of p.services || []) serviceCounts.set(s, (serviceCounts.get(s) || 0) + 1)
    if (p.start != null) firstYear = firstYear == null ? p.start : Math.min(firstYear, p.start)
    const y = p.end ?? p.start
    if (y != null) lastYear = lastYear == null ? y : Math.max(lastYear, y)
  }

  const topDomains = Array.from(domainCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => ({ name, count }))
  const topServices = Array.from(serviceCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => ({ name, count }))

  projects.sort((a, b) => (b.start || 0) - (a.start || 0))

  return NextResponse.json({
    name: displayName,
    projectCount: projects.length,
    topDomains,
    topServices,
    firstYear,
    lastYear,
    projects,
  })
}
