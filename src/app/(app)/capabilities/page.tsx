import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

type Row = {
  id: string
  client: string | null
  project_name: string | null
  section: string | null
  output: string | null
  domains: string[] | null
  services: string[] | null
}

type Example = { id: string; client: string; projectName: string }
type Entry = { value: string; count: number; examples: Example[] }

function aggregate(
  rows: Row[],
  getValues: (r: Row) => (string | null | undefined)[]
): Entry[] {
  const map = new Map<string, { count: number; examples: Example[] }>()
  for (const r of rows) {
    for (const raw of getValues(r)) {
      const v = (raw || '').trim()
      if (!v) continue
      const existing = map.get(v) || { count: 0, examples: [] }
      existing.count++
      if (existing.examples.length < 3) {
        existing.examples.push({
          id: r.id,
          client: r.client || '',
          projectName: r.project_name || '',
        })
      }
      map.set(v, existing)
    }
  }
  return Array.from(map.entries())
    .map(([value, { count, examples }]) => ({ value, count, examples }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value))
}

async function fetchCapabilities() {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('projects')
    .select('id, client, project_name, section, output, domains, services')
  const rows = (data || []) as Row[]
  return {
    totalProjects: rows.length,
    domains: aggregate(rows, (r) => r.domains || []),
    services: aggregate(rows, (r) => r.services || []),
    outputs: aggregate(rows, (r) => [r.output]),
    sections: aggregate(rows, (r) => [r.section]),
  }
}

function Section({
  title,
  description,
  entries,
}: {
  title: string
  description: string
  entries: Entry[]
}) {
  return (
    <section className="mb-12">
      <div className="mb-4">
        <h2 className="text-[0.95rem] font-[500] text-[var(--c-gray-900)]">{title}</h2>
        <p className="text-[12px] text-[var(--c-gray-500)] mt-1">{description}</p>
      </div>
      {entries.length === 0 ? (
        <div className="text-[12px] text-[var(--c-gray-400)] italic py-4">No data yet.</div>
      ) : (
        <div className="border border-[var(--c-gray-100)] rounded-[var(--radius-sm)] overflow-hidden">
          <div className="grid grid-cols-[1fr_60px_2fr] gap-4 px-3 py-2 bg-[var(--c-gray-50)] border-b border-[var(--c-gray-100)] text-[11px] uppercase tracking-wide text-[var(--c-gray-500)]">
            <div>Capability</div>
            <div className="text-right">Projects</div>
            <div>Examples</div>
          </div>
          {entries.map((e) => (
            <div
              key={e.value}
              className="grid grid-cols-[1fr_60px_2fr] gap-4 px-3 py-2.5 border-b border-[var(--c-gray-50)] last:border-b-0 text-[13px] items-start"
            >
              <div className="text-[var(--c-gray-900)] font-[400]">{e.value}</div>
              <div className="text-right text-[var(--c-gray-700)] tabular-nums">{e.count}</div>
              <div className="flex flex-wrap gap-x-2 gap-y-1 text-[12px] text-[var(--c-gray-500)]">
                {e.examples.map((ex, i) => (
                  <span key={ex.id}>
                    <Link
                      href={`/project/${ex.id}`}
                      className="hover:text-[var(--c-gray-900)] hover:underline"
                    >
                      {ex.client}
                      {ex.projectName ? ` — ${ex.projectName}` : ''}
                    </Link>
                    {i < e.examples.length - 1 ? ',' : ''}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

export default async function CapabilitiesPage() {
  const { totalProjects, domains, services, outputs, sections } = await fetchCapabilities()

  return (
    <div className="h-full overflow-y-auto bg-[var(--c-white)]">
      <div className="max-w-[1200px] px-4 sm:px-6 md:px-[48px] py-10">
        <h1 className="text-[1.4rem] font-[300] tracking-[-0.02em] text-[var(--c-gray-900)] mb-2">
          Capabilities
        </h1>
        <p className="text-[13px] text-[var(--c-gray-500)] mb-10">
          Aggregated inventory of domains, services and outputs across{' '}
          <span className="text-[var(--c-gray-900)]">{totalProjects}</span> projects. Useful for
          proposal writing and new-hire orientation.
        </p>

        <Section
          title="By Domain"
          description="Industry and subject-matter areas the studio has worked in."
          entries={domains}
        />
        <Section
          title="By Service"
          description="Types of work delivered across projects."
          entries={services}
        />
        <Section
          title="By Output"
          description="Final deliverable formats produced."
          entries={outputs}
        />
        <Section
          title="By Unit"
          description="Studio vs Tech split across sections."
          entries={sections}
        />
      </div>
    </div>
  )
}
