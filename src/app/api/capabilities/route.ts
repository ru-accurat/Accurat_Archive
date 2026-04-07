import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export type CapabilityExample = {
  id: string
  client: string
  projectName: string
}

export type CapabilityEntry = {
  value: string
  count: number
  examples: CapabilityExample[]
}

export type CapabilitiesPayload = {
  totalProjects: number
  domains: CapabilityEntry[]
  services: CapabilityEntry[]
  outputs: CapabilityEntry[]
  sections: CapabilityEntry[]
}

type Row = {
  id: string
  client: string | null
  project_name: string | null
  section: string | null
  output: string | null
  domains: string[] | null
  services: string[] | null
}

function aggregate(
  rows: Row[],
  getValues: (r: Row) => (string | null | undefined)[]
): CapabilityEntry[] {
  const map = new Map<string, { count: number; examples: CapabilityExample[] }>()
  for (const r of rows) {
    const values = getValues(r)
    for (const raw of values) {
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

export async function GET() {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('projects')
    .select('id, client, project_name, section, output, domains, services')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const rows = (data || []) as Row[]

  const payload: CapabilitiesPayload = {
    totalProjects: rows.length,
    domains: aggregate(rows, (r) => r.domains || []),
    services: aggregate(rows, (r) => r.services || []),
    outputs: aggregate(rows, (r) => [r.output]),
    sections: aggregate(rows, (r) => [r.section]),
  }

  return NextResponse.json(payload, {
    headers: {
      'Cache-Control': 'private, max-age=300, stale-while-revalidate=900',
    },
  })
}
