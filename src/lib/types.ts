export interface UserProfile {
  id: string
  email: string
  displayName: string
  role: 'admin' | 'editor' | 'viewer'
}

export interface Project {
  id: string
  fullName: string
  client: string
  projectName: string
  tier: number
  section: string
  start: number | null
  end: number | null
  domains: string[]
  services: string[]
  tagline: string
  description: string
  challenge: string
  solution: string
  deliverables: string
  clientQuotes: string
  team: string[]
  urls: string[]
  output: string
  mediaOrder?: string[]
  heroImage?: string
  thumbImage?: string
  sectionImages?: string[]
  aiGenerated?: string[]
  folderName: string
  clientLogo?: string
  pdfFiles?: string[]
  status: 'draft' | 'internal' | 'public'
  locationName?: string
  latitude?: number | null
  longitude?: number | null
  shareToken?: string | null
}

/**
 * Lightweight Project shape used in list views (home/timeline/map).
 * Excludes heavy text fields (challenge, solution, deliverables, clientQuotes)
 * and other fields only needed on the detail page (pdfFiles, sectionImages, shareToken, urls).
 * `completeness` is precomputed server-side so we don't need the heavy fields for sorting.
 * `hasMedia` is precomputed for the "missing media" filter.
 */
export interface ProjectSummary {
  id: string
  fullName: string
  client: string
  projectName: string
  tier: number
  section: string
  start: number | null
  end: number | null
  domains: string[]
  services: string[]
  tagline: string
  description: string
  team: string[]
  output: string
  heroImage?: string
  thumbImage?: string
  aiGenerated?: string[]
  folderName: string
  clientLogo?: string
  status: 'draft' | 'internal' | 'public'
  locationName?: string
  latitude?: number | null
  longitude?: number | null
  completeness: number
  hasMedia: boolean
  urls: string[]
}

export interface HistoryEntry {
  timestamp: string
  project: Project
}

export interface MediaFile {
  filename: string
  path: string
  type: 'image' | 'video' | 'gif'
  size?: number
}

export const SCORED_FIELDS = [
  'tagline',
  'description',
  'challenge',
  'solution',
  'deliverables',
  'clientQuotes',
  'team',
  'urls',
  'domains',
  'services'
] as const

export type ScoredField = (typeof SCORED_FIELDS)[number]

export interface Client {
  id: string
  name: string
  aliases: string[]
  notes: string
  engagementCount?: number
  projectCount?: number
  totalRevenue?: number
}

export interface Engagement {
  id: string
  year: number
  projectName: string
  clientId: string
  clientName?: string
  originalClientName: string
  amountEur: number | null
  amountUsd: number | null
  importBatchId?: string
  notes: string
  linkedProjectCount?: number
}

export interface ImportBatch {
  id: string
  filename: string
  rowCount: number
  createdAt: string
}

export interface ClientMatch {
  original: string
  matchedClient: Client | null
  confidence: 'exact' | 'fuzzy' | 'none'
}

export interface ParsedEngagementRow {
  year: number
  projectName: string
  clientName: string
  amountEur: number | null
  amountUsd: number | null
}

export interface CaseStudyDraft {
  id: string
  projectId: string
  userId: string | null
  notes: string
  fields: Record<string, string>
  quality: string
  referenceProjectId: string | null
  isIterative: boolean
  tokensUsed: number | null
  createdAt: string
}

export interface FilterPreset {
  id: string
  name: string
  filters: {
    search?: string
    domains?: string[]
    services?: string[]
    output?: string[]
    section?: string[]
    yearRange?: [number | null, number | null]
    tier?: number[]
    missing?: string[]
    status?: string[]
  }
  sortField?: string | null
  sortDirection?: 'asc' | 'desc' | null
  viewMode?: 'table' | 'grid' | null
  createdAt: string
  updatedAt: string
}
