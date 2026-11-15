import type { MediaRole } from './types'

/** A project_media row as the app reads it. */
export interface ProjectMediaRow {
  id: string
  project_id: string
  bucket: string
  path: string
  kind: 'image' | 'video'
  role: MediaRole
  source: 'deck' | 'archive'
  position: number | null
  caption: string
  is_hero: boolean
  is_thumbnail: boolean
  width: number | null
  height: number | null
  duration: number | null
  deck_slide: number | null
  flags: string[] | null
  web_path: string | null
  poster_path: string | null
  playback: 'ambient' | 'player' | null
}

export const PROJECT_MEDIA_COLUMNS =
  'id, project_id, bucket, path, kind, role, source, position, caption, is_hero, is_thumbnail, width, height, duration, deck_slide, flags, web_path, poster_path, playback'

export const ROLE_ORDER: Record<MediaRole, number> = { selected: 0, backup: 1, inuse: 2 }

/**
 * Why a file can't become `selected`, or null if it can.
 * The website reads selected media only, and needs dimensions for every file
 * (migration 026 enforces it) plus a web copy and poster for every video (M9).
 */
export function promoteBlockReason(row: Pick<ProjectMediaRow, 'kind' | 'role' | 'width' | 'height' | 'duration' | 'web_path' | 'poster_path'>): string | null {
  if (row.role === 'inuse') return 'In-use mockups stay in-use'
  if (!row.width || !row.height) return 'No dimensions recorded'
  if (row.kind === 'video') {
    if (row.duration == null) return 'No duration recorded'
    if (!row.web_path || !row.poster_path) return 'No web copy yet (run the M9 video tool)'
  }
  return null
}

/** File name part of a storage path. */
export function baseName(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1)
}
