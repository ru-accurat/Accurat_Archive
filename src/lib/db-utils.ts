import type { Project } from './types'

// Database row type (snake_case columns)
export interface ProjectRow {
  id: string
  full_name: string
  client: string
  project_name: string
  tier: number
  section: string
  start_year: number | null
  end_year: number | null
  domains: string[]
  services: string[]
  tagline: string
  description: string
  challenge: string
  solution: string
  deliverables: string
  client_quotes: string
  team: string[]
  urls: string[]
  output: string
  folder_name: string
  media_order: string[] | null
  hero_image: string | null
  thumb_image: string | null
  ai_generated: string[] | null
  client_logo: string | null
  created_at?: string
  updated_at?: string
}

/** Convert a Supabase row to the frontend Project type */
export function rowToProject(row: ProjectRow): Project {
  return {
    id: row.id,
    fullName: row.full_name,
    client: row.client,
    projectName: row.project_name,
    tier: row.tier,
    section: row.section,
    start: row.start_year,
    end: row.end_year,
    domains: row.domains || [],
    services: row.services || [],
    tagline: row.tagline,
    description: row.description,
    challenge: row.challenge,
    solution: row.solution,
    deliverables: row.deliverables,
    clientQuotes: row.client_quotes,
    team: row.team || [],
    urls: row.urls || [],
    output: row.output,
    folderName: row.folder_name,
    mediaOrder: row.media_order || undefined,
    heroImage: row.hero_image || undefined,
    thumbImage: row.thumb_image || undefined,
    aiGenerated: row.ai_generated || undefined,
    clientLogo: row.client_logo || undefined,
  }
}

/** Convert a frontend Project (or partial) to a Supabase row for insert/update */
export function projectToRow(project: Partial<Project>): Partial<ProjectRow> {
  const row: Record<string, unknown> = {}

  if (project.id !== undefined) row.id = project.id
  if (project.fullName !== undefined) row.full_name = project.fullName
  if (project.client !== undefined) row.client = project.client
  if (project.projectName !== undefined) row.project_name = project.projectName
  if (project.tier !== undefined) row.tier = project.tier
  if (project.section !== undefined) row.section = project.section
  if (project.start !== undefined) row.start_year = project.start
  if (project.end !== undefined) row.end_year = project.end
  if (project.domains !== undefined) row.domains = project.domains
  if (project.services !== undefined) row.services = project.services
  if (project.tagline !== undefined) row.tagline = project.tagline
  if (project.description !== undefined) row.description = project.description
  if (project.challenge !== undefined) row.challenge = project.challenge
  if (project.solution !== undefined) row.solution = project.solution
  if (project.deliverables !== undefined) row.deliverables = project.deliverables
  if (project.clientQuotes !== undefined) row.client_quotes = project.clientQuotes
  if (project.team !== undefined) row.team = project.team
  if (project.urls !== undefined) row.urls = project.urls
  if (project.output !== undefined) row.output = project.output
  if (project.folderName !== undefined) row.folder_name = project.folderName
  if (project.mediaOrder !== undefined) row.media_order = project.mediaOrder
  if (project.heroImage !== undefined) row.hero_image = project.heroImage
  if (project.thumbImage !== undefined) row.thumb_image = project.thumbImage
  if (project.aiGenerated !== undefined) row.ai_generated = project.aiGenerated
  if (project.clientLogo !== undefined) row.client_logo = project.clientLogo

  return row as Partial<ProjectRow>
}
