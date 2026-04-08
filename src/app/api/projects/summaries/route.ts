import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { rowToProjectSummary } from '@/lib/db-utils'
import type { ProjectSummaryRow } from '@/lib/db-utils'

// Columns needed to compute ProjectSummary. We select challenge/solution/etc
// only for the completeness count, not to ship them to the client.
const SUMMARY_COLUMNS = [
  'id', 'full_name', 'client', 'client_2', 'agency', 'project_name', 'tier', 'section',
  'start_year', 'end_year', 'domains', 'services', 'tagline', 'description',
  'challenge', 'solution', 'deliverables', 'client_quotes',
  'team', 'urls', 'output', 'folder_name', 'media_order', 'hero_image',
  'thumb_image', 'ai_generated', 'client_logo', 'status', 'location_name',
  'latitude', 'longitude',
].join(',')

// GET /api/projects/summaries — list all projects as lightweight summaries
export async function GET() {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('projects')
    .select(SUMMARY_COLUMNS)
    .order('client', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const summaries = (data as unknown as ProjectSummaryRow[]).map(rowToProjectSummary)
  return NextResponse.json(summaries, {
    headers: {
      'Cache-Control': 'private, max-age=30, stale-while-revalidate=300',
    },
  })
}
