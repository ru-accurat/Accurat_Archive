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
