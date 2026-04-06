import { createServiceClient } from '@/lib/supabase'
import { rowToProjectSummary, type ProjectSummaryRow } from '@/lib/db-utils'
import type { ProjectSummary } from '@/lib/types'
import { IndexPageClient } from './client'

export const dynamic = 'force-dynamic'

const SUMMARY_COLUMNS = [
  'id', 'full_name', 'client', 'project_name', 'tier', 'section',
  'start_year', 'end_year', 'domains', 'services', 'tagline', 'description',
  'challenge', 'solution', 'deliverables', 'client_quotes',
  'team', 'urls', 'output', 'folder_name', 'media_order', 'hero_image',
  'thumb_image', 'ai_generated', 'client_logo', 'status', 'location_name',
  'latitude', 'longitude',
].join(',')

async function fetchProjectSummaries(): Promise<ProjectSummary[]> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('projects')
    .select(SUMMARY_COLUMNS)
    .order('client', { ascending: true })

  if (error || !data) return []
  return (data as unknown as ProjectSummaryRow[]).map(rowToProjectSummary)
}

export default async function IndexPage() {
  const projects = await fetchProjectSummaries()
  return <IndexPageClient initialProjects={projects} />
}
