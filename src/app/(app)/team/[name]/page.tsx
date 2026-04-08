import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase'
import { rowToProject, type ProjectRow } from '@/lib/db-utils'
import { Breadcrumb } from '@/components/shared/Breadcrumb'
import { mediaUrl } from '@/lib/media-url'

export const dynamic = 'force-dynamic'

async function fetchMember(rawName: string) {
  const name = decodeURIComponent(rawName).trim()
  if (!name) return null
  const lower = name.toLowerCase()

  const supabase = createServiceClient()

  // Try an indexed `contains` first for speed.
  let rows: ProjectRow[] = []
  const { data: directHit } = await supabase
    .from('projects')
    .select('*')
    .contains('team', [name])

  if (directHit && directHit.length > 0) {
    rows = directHit as ProjectRow[]
  } else {
    // Fall back to full scan for case-insensitive matching
    const { data: all } = await supabase.from('projects').select('*')
    rows = ((all || []) as ProjectRow[]).filter(row =>
      (row.team || []).some(t => (t || '').trim().toLowerCase() === lower)
    )
  }

  if (rows.length === 0) return null

  let displayName = name
  for (const row of rows) {
    const found = (row.team || []).find(t => (t || '').trim().toLowerCase() === lower)
    if (found) { displayName = found.trim(); break }
  }

  const projects = rows.map(rowToProject)
  projects.sort((a, b) => (b.start || 0) - (a.start || 0))

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

  const topDomains = Array.from(domainCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8)
  const topServices = Array.from(serviceCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8)

  return { name: displayName, projects, topDomains, topServices, firstYear, lastYear }
}

export default async function TeamMemberPage({
  params,
}: {
  params: Promise<{ name: string }>
}) {
  const { name } = await params
  const member = await fetchMember(name)
  if (!member) notFound()

  const yearRange = member.firstYear && member.lastYear
    ? member.firstYear === member.lastYear ? `${member.firstYear}` : `${member.firstYear}–${member.lastYear}`
    : '—'

  return (
    <div className="h-full overflow-y-auto bg-[var(--c-white)]">
      <div className="max-w-[1200px] px-4 sm:px-6 md:px-[48px] py-10 mx-auto">
        <div className="mb-4">
          <Breadcrumb items={[
            { label: 'Team', href: '/team' },
            { label: member.name },
          ]} />
        </div>

        <div className="mb-8">
          <h1 className="text-[1.4rem] font-[300] tracking-[-0.02em] text-[var(--c-gray-900)]">{member.name}</h1>
        </div>

        <div className="flex gap-8 mb-8 flex-wrap">
          <div>
            <div className="text-[24px] font-[300] text-[var(--c-gray-900)]">{member.projects.length}</div>
            <div className="text-[11px] text-[var(--c-gray-400)]">projects</div>
          </div>
          <div>
            <div className="text-[24px] font-[300] text-[var(--c-gray-600)]">{yearRange}</div>
            <div className="text-[11px] text-[var(--c-gray-400)]">year range</div>
          </div>
          <div>
            <div className="text-[24px] font-[300] text-[var(--c-gray-600)]">{member.topDomains.length}</div>
            <div className="text-[11px] text-[var(--c-gray-400)]">domains</div>
          </div>
          <div>
            <div className="text-[24px] font-[300] text-[var(--c-gray-600)]">{member.topServices.length}</div>
            <div className="text-[11px] text-[var(--c-gray-400)]">services</div>
          </div>
        </div>

        {(member.topDomains.length > 0 || member.topServices.length > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10">
            {member.topDomains.length > 0 && (
              <div>
                <h2 className="text-[11px] font-[500] tracking-[0.06em] uppercase text-[var(--c-gray-400)] mb-2">Top Domains</h2>
                <div className="flex gap-1.5 flex-wrap">
                  {member.topDomains.map(([d, c]) => (
                    <span key={d} className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--c-gray-100)] text-[var(--c-gray-600)]">
                      {d} <span className="text-[var(--c-gray-400)] tabular-nums">· {c}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
            {member.topServices.length > 0 && (
              <div>
                <h2 className="text-[11px] font-[500] tracking-[0.06em] uppercase text-[var(--c-gray-400)] mb-2">Top Services</h2>
                <div className="flex gap-1.5 flex-wrap">
                  {member.topServices.map(([s, c]) => (
                    <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--c-gray-100)] text-[var(--c-gray-600)]">
                      {s} <span className="text-[var(--c-gray-400)] tabular-nums">· {c}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div>
          <h2 className="text-[13px] font-[450] text-[var(--c-gray-700)] mb-3">Projects ({member.projects.length})</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {member.projects.map((p) => {
              const img = p.thumbImage || p.heroImage
              const imgUrl = img ? mediaUrl(p.folderName, img) : null
              return (
                <Link key={p.id} href={`/project/${p.id}`} className="text-left group block">
                  <div className="aspect-[4/3] relative rounded-[var(--radius-sm)] overflow-hidden bg-[var(--c-gray-100)] mb-2">
                    {imgUrl ? (
                      <Image
                        src={imgUrl}
                        alt={p.projectName}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[var(--c-gray-300)] text-[10px]">No image</div>
                    )}
                  </div>
                  <p className="text-[11px] font-[500] text-[var(--c-gray-800)] truncate">{p.projectName}</p>
                  <p className="text-[10px] text-[var(--c-gray-400)] truncate">
                    {p.client}{p.start ? ` · ${p.start}` : ''}
                  </p>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
