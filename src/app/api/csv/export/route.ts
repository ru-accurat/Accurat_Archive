import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { rowToProject } from '@/lib/db-utils'
import type { ProjectRow } from '@/lib/db-utils'
import Papa from 'papaparse'

// POST /api/csv/export — export selected projects as CSV
export async function POST(request: Request) {
  const supabase = createServiceClient()
  const { projectIds } = await request.json()

  let query = supabase.from('projects').select('*')
  if (projectIds?.length) {
    query = query.in('id', projectIds)
  }

  const { data, error } = await query.order('client', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const projects = (data as ProjectRow[]).map(rowToProject)

  const rows = projects.map(p => ({
    'Full Name': p.fullName,
    'Client': p.client,
    'Project Name': p.projectName,
    'Tier': p.tier,
    'Unit': p.section,
    'Start': p.start ?? '',
    'End': p.end ?? '',
    'Domains and Sectors': p.domains.map(d => `#${d}`).join(','),
    'Services': p.services.join(', '),
    'Tagline': p.tagline,
    'Description': p.description,
    'Challenge': p.challenge,
    'Solution': p.solution,
    'Deliverables': p.deliverables,
    'Client Quotes': p.clientQuotes,
    'Accurat Team': p.team.join(','),
    'URL 1': p.urls[0] || '',
    'URL 2': p.urls[1] || '',
    'URL 3': p.urls[2] || '',
    'Output': p.output,
    'Status': p.status,
    'Location': p.locationName ?? '',
    'Latitude': p.latitude ?? '',
    'Longitude': p.longitude ?? '',
    'Folder Name': p.folderName,
    'Hero Image': p.heroImage ?? '',
    'Thumb Image': p.thumbImage ?? '',
    'Client Logo': p.clientLogo ?? '',
    'PDF Files': (p.pdfFiles || []).join(', '),
    'Media Order': (p.mediaOrder || []).join(', '),
    'AI Generated': (p.aiGenerated || []).join(', '),
  }))

  const csv = Papa.unparse(rows)

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="accurat-archive-export.csv"',
    },
  })
}
