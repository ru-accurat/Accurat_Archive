import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { projectToRow } from '@/lib/db-utils'
import type { Project } from '@/lib/types'

function toSlug(fullName: string): string {
  return fullName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

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

// POST /api/csv/apply — apply parsed CSV data as project upserts
export async function POST(request: Request) {
  const supabase = createServiceClient()
  const { rows, columnMapping } = await request.json()

  if (!rows || !Array.isArray(rows)) {
    return NextResponse.json({ error: 'rows array is required' }, { status: 400 })
  }

  // columnMapping maps CSV header → project field name
  const mapping = columnMapping || {
    'Full Name': 'fullName',
    'Client': 'client',
    'Project Name': 'projectName',
    'Tier': 'tier',
    'Unit': 'section',
    'Section': 'section',
    'Start': 'start',
    'End': 'end',
    'Domains and Sectors': 'domains',
    'Services': 'services',
    'Tagline': 'tagline',
    'Description': 'description',
    'Challenge': 'challenge',
    'Solution': 'solution',
    'Deliverables': 'deliverables',
    'Client Quotes': 'clientQuotes',
    'Accurat Team': 'team',
    'URL 1': 'url1',
    'URL 2': 'url2',
    'URL 3': 'url3',
    'Output': 'output',
  }

  let created = 0
  let updated = 0
  let errors = 0

  for (const row of rows) {
    // Map CSV columns to project fields using mapping
    const mapped: Record<string, string> = {}
    for (const [csvCol, projectField] of Object.entries(mapping)) {
      if (row[csvCol] !== undefined) {
        mapped[projectField as string] = row[csvCol]
      }
    }

    const fullName = (mapped.fullName || '').trim()
    if (!fullName) continue

    const client = (mapped.client || '').trim()
    const projectName = (mapped.projectName || '').trim()
    const id = toSlug(fullName)

    const project: Partial<Project> = {
      id,
      fullName,
      client,
      projectName,
      tier: parseInt(mapped.tier || '3', 10),
      section: (mapped.section || '').trim(),
      start: parseYear(mapped.start || ''),
      end: parseYear(mapped.end || ''),
      domains: parseDomains(mapped.domains || ''),
      services: parseList(mapped.services || ''),
      tagline: (mapped.tagline || '').trim(),
      description: (mapped.description || '').trim(),
      challenge: (mapped.challenge || '').trim(),
      solution: (mapped.solution || '').trim(),
      deliverables: (mapped.deliverables || '').trim(),
      clientQuotes: (mapped.clientQuotes || '').trim(),
      team: parseList(mapped.team || ''),
      urls: [mapped.url1, mapped.url2, mapped.url3].map(u => (u || '').trim()).filter(Boolean),
      output: (mapped.output || '').trim(),
      folderName: fullName,
    }

    const dbRow = projectToRow(project)

    // Check if exists
    const { data: existing } = await supabase
      .from('projects')
      .select('id')
      .eq('id', id)
      .single()

    if (existing) {
      const { error } = await supabase.from('projects').update(dbRow).eq('id', id)
      if (error) { errors++; continue }
      updated++
    } else {
      const { error } = await supabase.from('projects').insert(dbRow)
      if (error) { errors++; continue }
      created++
    }
  }

  return NextResponse.json({ success: true, created, updated, errors })
}
