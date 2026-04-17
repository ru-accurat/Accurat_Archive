/** Role-based access helpers shared by client + server. */

export type Role = 'admin' | 'editor' | 'viewer' | 'content_reader'

/** Editors + admins can write. Viewers + content readers are read-only. */
export function canEdit(role: Role | null | undefined): boolean {
  return role === 'admin' || role === 'editor'
}

/** Only admins can delete. */
export function canDelete(role: Role | null | undefined): boolean {
  return role === 'admin'
}

/** Content readers cannot see Clients / Engagements / financial data. */
export function canSeeBusiness(role: Role | null | undefined): boolean {
  return role !== 'content_reader'
}

/** Content readers also lose the "needs attention" dashboard. */
export function canSeeAdminDashboards(role: Role | null | undefined): boolean {
  return role !== 'content_reader'
}

/** Paths blocked for content_reader. */
export const CONTENT_READER_BLOCKED_PREFIXES = [
  '/clients',
  '/engagements',
  '/needs-attention',
]

/** Paths/API prefixes that require edit privileges (write/mutation). */
export const EDIT_REQUIRED_API_PREFIXES = [
  '/api/clients',
  '/api/engagements',
]
