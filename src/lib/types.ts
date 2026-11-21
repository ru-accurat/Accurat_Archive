import type { ProjectStatus } from './status'

export interface UserProfile {
  id: string
  email: string
  displayName: string
  role: 'admin' | 'editor' | 'viewer' | 'content_reader'
}

export interface Project {
  id: string
  fullName: string
  client: string
  client2?: string | null
  partners?: string[]
  projectName: string
  tier: number
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
  status: ProjectStatus
  locationName?: string
  latitude?: number | null
  longitude?: number | null
  shareToken?: string | null
  updatedAt?: string
  publishedAt?: string | null
  hasUnpublishedChanges?: boolean
  // Deck consolidation fields (migrations 021 and 024)
  ongoing?: boolean
  deckNo?: number | null
  categoryId?: number | null
  offerings?: Offering[]
  whatWeMade?: string
  deckChallenge?: string
  roleAndProcess?: string
  outcome?: string
  heroVideo?: string | null
}

export const OFFERINGS = ['digital-products', 'reporting-products', 'immersive-experiences'] as const
export type Offering = (typeof OFFERINGS)[number]
export const OFFERING_LABELS: Record<Offering, string> = {
  'digital-products': 'Digital products',
  'reporting-products': 'Reporting products',
  'immersive-experiences': 'Immersive experiences',
}

export interface Category {
  id: number
  number: number
  name: string
  slug: string
  shortDescription: string
}

/** A project's website state, from /api/projects/[id]/website. */
export interface WebsiteStatus {
  deckNo: number | null
  /** Status is public or private and the project has a Library number */
  live: boolean
  /** The first Library number after the highest one in use */
  nextFree: number
  /** What a project needs before it can go on the website */
  checks: { key: string; label: string; ok: boolean }[]
}

/** Result of a batch status change (/api/projects/status). */
export interface StatusChangeResponse {
  changed: { id: string; status: ProjectStatus; deckNo: number | null; name: string }[]
  skipped: { id: string; name: string; reason: string }[]
  unchanged: number
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
  client2?: string | null
  partners?: string[]
  projectName: string
  tier: number
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
  status: ProjectStatus
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

export type MediaRole = 'selected' | 'backup' | 'inuse'

export interface MediaFile {
  filename: string
  path: string
  type: 'image' | 'video' | 'gif'
  size?: number
  /** project_media row, when the file has one */
  mediaId?: string
  role?: MediaRole
  source?: 'deck' | 'archive'
  position?: number | null
  caption?: string
  isHero?: boolean
  isThumbnail?: boolean
  width?: number | null
  height?: number | null
  duration?: number | null
  deckSlide?: number | null
  flags?: string[]
  hasWebCopy?: boolean
  playback?: 'ambient' | 'player' | null
  /** Why this backup file can't be made selected (missing dimensions, no web copy). Null when it can. */
  promoteBlock?: string | null
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
