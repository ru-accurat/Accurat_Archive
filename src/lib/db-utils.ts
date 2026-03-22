import type { Project, Client, Engagement, ImportBatch } from './types'

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
  pdf_files: string[] | null
  status: string
  location_name: string | null
  latitude: number | null
  longitude: number | null
  share_token: string | null
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
    pdfFiles: row.pdf_files || [],
    status: (row.status as 'draft' | 'internal' | 'public') || 'draft',
    locationName: row.location_name || undefined,
    latitude: row.latitude,
    longitude: row.longitude,
    shareToken: row.share_token,
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
  if (project.pdfFiles !== undefined) row.pdf_files = project.pdfFiles
  if (project.status !== undefined) row.status = project.status
  if (project.locationName !== undefined) row.location_name = project.locationName
  if (project.latitude !== undefined) row.latitude = project.latitude
  if (project.longitude !== undefined) row.longitude = project.longitude

  return row as Partial<ProjectRow>
}

// --- Client row mapping ---

export interface ClientRow {
  id: string
  name: string
  aliases: string[]
  notes: string
  created_at?: string
  updated_at?: string
  engagement_count?: number
  project_count?: number
  total_revenue?: number
}

export function rowToClient(row: ClientRow): Client {
  return {
    id: row.id,
    name: row.name,
    aliases: row.aliases || [],
    notes: row.notes || '',
    engagementCount: row.engagement_count,
    projectCount: row.project_count,
    totalRevenue: row.total_revenue != null ? Number(row.total_revenue) : undefined,
  }
}

// --- Engagement row mapping ---

export interface EngagementRow {
  id: string
  year: number
  project_name: string
  client_id: string
  original_client_name: string
  amount_eur: number | null
  amount_usd: number | null
  import_batch_id: string | null
  notes: string
  created_at?: string
  updated_at?: string
  client_name?: string
  linked_project_count?: number
}

export function rowToEngagement(row: EngagementRow): Engagement {
  return {
    id: row.id,
    year: row.year,
    projectName: row.project_name,
    clientId: row.client_id,
    clientName: row.client_name,
    originalClientName: row.original_client_name,
    amountEur: row.amount_eur != null ? Number(row.amount_eur) : null,
    amountUsd: row.amount_usd != null ? Number(row.amount_usd) : null,
    importBatchId: row.import_batch_id || undefined,
    notes: row.notes || '',
    linkedProjectCount: row.linked_project_count,
  }
}

// --- Import batch row mapping ---

export interface ImportBatchRow {
  id: string
  filename: string
  row_count: number
  created_at: string
}

export function rowToImportBatch(row: ImportBatchRow): ImportBatch {
  return {
    id: row.id,
    filename: row.filename,
    rowCount: row.row_count,
    createdAt: row.created_at,
  }
}
