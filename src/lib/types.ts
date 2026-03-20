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
