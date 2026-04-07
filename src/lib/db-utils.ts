import type { Project, ProjectSummary, Client, Engagement, ImportBatch } from './types'

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
  published_version: Record<string, unknown> | null
  published_at: string | null
  created_at?: string
  updated_at?: string
}

/** Compare current row content against published_version snapshot.
 * Returns true if ANY tracked field differs. */
function computeHasUnpublishedChanges(row: ProjectRow): boolean {
  const pv = row.published_version
  if (!pv) return false
  const eq = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null)
  return !(
    eq(pv.name, row.project_name) &&
    eq(pv.client, row.client) &&
    eq(pv.tagline, row.tagline) &&
    eq(pv.description, row.description) &&
    eq(pv.challenge, row.challenge) &&
    eq(pv.solution, row.solution) &&
    eq(pv.deliverables, row.deliverables) &&
    eq(pv.client_quotes, row.client_quotes) &&
    eq(pv.domains, row.domains) &&
    eq(pv.services, row.services) &&
    eq(pv.tier, row.tier) &&
    eq(pv.section, row.section) &&
    eq(pv.status, row.status) &&
    eq(pv.output, row.output)
  )
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
    publishedAt: row.published_at,
    hasUnpublishedChanges: computeHasUnpublishedChanges(row),
  }
}

/** Lightweight row shape for summary queries (no heavy text fields) */
export interface ProjectSummaryRow {
  id: string
  full_name: string
  client: string
  project_name: string
  tier: number
  section: string
  start_year: number | null
  end_year: number | null
  domains: string[] | null
  services: string[] | null
  tagline: string | null
  description: string | null
  challenge: string | null
  solution: string | null
  deliverables: string | null
  client_quotes: string | null
  team: string[] | null
  urls: string[] | null
  output: string | null
  folder_name: string
  media_order: string[] | null
  hero_image: string | null
  thumb_image: string | null
  ai_generated: string[] | null
  client_logo: string | null
  status: string | null
  location_name: string | null
  latitude: number | null
  longitude: number | null
}

/**
 * Convert a DB row to a lightweight ProjectSummary.
 * Strips heavy text fields (challenge, solution, deliverables, clientQuotes)
 * and precomputes `completeness` and `hasMedia`.
 * NOTE: `description` is kept because it's used in search.
 */
export function rowToProjectSummary(row: ProjectSummaryRow): ProjectSummary {
  // Precompute completeness the same way getQuickCompleteness does
  let completeness = 0
  if (row.tagline) completeness++
  if (row.description) completeness++
  if (row.challenge) completeness++
  if (row.solution) completeness++
  if (row.deliverables) completeness++
  if (row.client_quotes) completeness++
  if ((row.team?.length || 0) > 0) completeness++
  if ((row.urls?.length || 0) > 0) completeness++
  if ((row.domains?.length || 0) > 0) completeness++
  if ((row.services?.length || 0) > 0) completeness++

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
    tagline: row.tagline || '',
    description: row.description || '',
    team: row.team || [],
    urls: row.urls || [],
    output: row.output || '',
    folderName: row.folder_name,
    heroImage: row.hero_image || undefined,
    thumbImage: row.thumb_image || undefined,
    aiGenerated: row.ai_generated || undefined,
    clientLogo: row.client_logo || undefined,
    status: (row.status as 'draft' | 'internal' | 'public') || 'draft',
    locationName: row.location_name || undefined,
    latitude: row.latitude,
    longitude: row.longitude,
    completeness,
    hasMedia: !!(row.media_order && row.media_order.length > 0),
  }
}

/** Convert a full Project to a ProjectSummary (for updating the project store after edits on the detail page) */
export function projectToSummary(p: Project): ProjectSummary {
  let completeness = 0
  if (p.tagline) completeness++
  if (p.description) completeness++
  if (p.challenge) completeness++
  if (p.solution) completeness++
  if (p.deliverables) completeness++
  if (p.clientQuotes) completeness++
  if ((p.team?.length || 0) > 0) completeness++
  if ((p.urls?.length || 0) > 0) completeness++
  if ((p.domains?.length || 0) > 0) completeness++
  if ((p.services?.length || 0) > 0) completeness++

  return {
    id: p.id,
    fullName: p.fullName,
    client: p.client,
    projectName: p.projectName,
    tier: p.tier,
    section: p.section,
    start: p.start,
    end: p.end,
    domains: p.domains || [],
    services: p.services || [],
    tagline: p.tagline || '',
    description: p.description || '',
    team: p.team || [],
    urls: p.urls || [],
    output: p.output || '',
    folderName: p.folderName,
    heroImage: p.heroImage,
    thumbImage: p.thumbImage,
    aiGenerated: p.aiGenerated,
    clientLogo: p.clientLogo,
    status: p.status,
    locationName: p.locationName,
    latitude: p.latitude,
    longitude: p.longitude,
    completeness,
    hasMedia: !!(p.mediaOrder && p.mediaOrder.length > 0),
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
