import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

function parseDomains(raw: string): string[] {
  if (!raw?.trim()) return []
  return raw.split(',').map(d => d.trim()).filter(Boolean).map(d => d.startsWith('#') ? d.slice(1) : d)
}

function parseList(raw: string): string[] {
  if (!raw?.trim()) return []
  return raw.split(',').map(s => s.trim()).filter(Boolean)
}

function parseYear(raw: string): number | null {
  const n = parseInt(raw, 10)
  return isNaN(n) ? null : n
}

// Map a project field name + raw CSV value to a DB column update
function fieldToDbUpdate(field: string, value: string): Record<string, unknown> {
  switch (field) {
    case 'fullName': return { full_name: value.trim() }
    case 'client': return { client: value.trim() }
    case 'projectName': return { project_name: value.trim() }
    case 'tier': return { tier: parseInt(value, 10) || 3 }
    case 'section': return { section: value.trim() }
    case 'start': return { start_year: parseYear(value) }
    case 'end': return { end_year: parseYear(value) }
    case 'domains': return { domains: parseDomains(value) }
    case 'services': return { services: parseList(value) }
    case 'tagline': return { tagline: value.trim() }
    case 'description': return { description: value.trim() }
    case 'challenge': return { challenge: value.trim() }
    case 'solution': return { solution: value.trim() }
    case 'deliverables': return { deliverables: value.trim() }
    case 'clientQuotes': return { client_quotes: value.trim() }
    case 'team': return { team: parseList(value) }
    case 'output': return { output: value.trim() }
    case 'urls': return {} // handled separately
    default: return {}
  }
}

// POST /api/csv/apply — apply parsed CSV data to matched projects
export async function POST(request: Request) {
  const supabase = createServiceClient()
  const body = await request.json()

  // Support both modal format (columnMap + matches) and direct format (columnMapping + rows)
  const rows = body.rows as Record<string, string>[]
  const matches = body.matches as { rowIndex: number; projectId: string }[] | undefined
  const columnMap = (body.columnMap || body.columnMapping) as Record<string, string>
  const selectedColumns = body.selectedColumns as string[] | undefined

  if (!rows || !Array.isArray(rows)) {
    return NextResponse.json({ error: 'rows array is required' }, { status: 400 })
  }

  // Default mapping if none provided
  const mapping = columnMap || {
    'Full Name': 'fullName', 'Client': 'client', 'Project Name': 'projectName',
    'Tier': 'tier', 'Unit': 'section', 'Start': 'start', 'End': 'end',
    'Domains and Sectors': 'domains', 'Services': 'services', 'Tagline': 'tagline',
    'Description': 'description', 'Challenge': 'challenge', 'Solution': 'solution',
    'Deliverables': 'deliverables', 'Client Quotes': 'clientQuotes',
    'Accurat Team': 'team', 'URL 1': 'urls', 'URL 2': 'urls', 'URL 3': 'urls',
    'Output': 'output',
  }

  // Only process selected/enabled columns
  const activeColumns = selectedColumns
    ? new Set(selectedColumns)
    : new Set(Object.keys(mapping))

  let updated = 0
  let errors = 0

  if (matches && matches.length > 0) {
    // Modal flow: update only matched rows by their projectId
    for (const match of matches) {
      const row = rows[match.rowIndex]
      if (!row) continue

      const dbUpdates: Record<string, unknown> = {}
      const urlValues: string[] = []

      for (const csvCol of activeColumns) {
        const field = mapping[csvCol]
        if (!field || row[csvCol] === undefined) continue

        if (field === 'urls') {
          const v = row[csvCol]?.trim()
          if (v) urlValues.push(v)
        } else {
          Object.assign(dbUpdates, fieldToDbUpdate(field, row[csvCol]))
        }
      }

      if (urlValues.length > 0) {
        dbUpdates.urls = urlValues
      }

      if (Object.keys(dbUpdates).length === 0) continue

      const { error } = await supabase
        .from('projects')
        .update(dbUpdates)
        .eq('id', match.projectId)

      if (error) { errors++; continue }
      updated++
    }
  } else {
    // Direct/fallback flow: match by slug
    for (const row of rows) {
      const mapped: Record<string, string> = {}
      for (const [csvCol, projectField] of Object.entries(mapping)) {
        if (row[csvCol] !== undefined && activeColumns.has(csvCol)) {
          mapped[projectField as string] = row[csvCol]
        }
      }

      const fullName = (mapped.fullName || row['Full Name'] || '').trim()
      if (!fullName) continue

      const id = fullName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

      const dbUpdates: Record<string, unknown> = {}
      for (const [field, value] of Object.entries(mapped)) {
        if (field === 'urls') continue
        Object.assign(dbUpdates, fieldToDbUpdate(field, value))
      }

      // Collect URLs
      const urlValues = [mapped.url1, mapped.url2, mapped.url3, mapped.urls]
        .filter(Boolean)
        .map(u => u.trim())
        .filter(Boolean)
      if (urlValues.length > 0) dbUpdates.urls = urlValues

      if (Object.keys(dbUpdates).length === 0) continue

      const { data: existing } = await supabase.from('projects').select('id').eq('id', id).single()
      if (existing) {
        const { error } = await supabase.from('projects').update(dbUpdates).eq('id', id)
        if (error) { errors++; continue }
        updated++
      }
    }
  }

  return NextResponse.json({ success: true, updated, errors })
}
