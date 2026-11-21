/**
 * Project status (migration 031). Status decides the website:
 * public and private are on it (private as confidential) and need a Library number (deck_no);
 * draft and archive_only are not, and may keep a reserved Library number.
 */
export const PROJECT_STATUSES = ['draft', 'archive_only', 'private', 'public'] as const
export type ProjectStatus = (typeof PROJECT_STATUSES)[number]

export const STATUS_LABELS: Record<ProjectStatus, string> = {
  draft: 'Draft',
  archive_only: 'Archive only',
  private: 'Private',
  public: 'Public',
}

export const STATUS_HINTS: Record<ProjectStatus, string> = {
  draft: 'Work in progress. Archive only.',
  archive_only: 'In the Archive, not on the website.',
  private: 'On the website as confidential: a teaser for everyone, the full case study for clients with access.',
  public: 'On the website.',
}

export const STATUS_OPTIONS = PROJECT_STATUSES.map((value) => ({ value, label: STATUS_LABELS[value] }))

/** Statuses that put a project on the website. */
export const ON_WEBSITE: ReadonlySet<ProjectStatus> = new Set<ProjectStatus>(['private', 'public'])

/** The project list hides drafts by default. */
export const DEFAULT_STATUS_FILTER: ProjectStatus[] = ['archive_only', 'private', 'public']

export function isProjectStatus(v: unknown): v is ProjectStatus {
  return typeof v === 'string' && (PROJECT_STATUSES as readonly string[]).includes(v)
}

/** Reads a stored or legacy status: 'internal' (before 031) is now 'private'; anything else unknown is a draft. */
export function normalizeStatus(v: unknown): ProjectStatus {
  if (v === 'internal') return 'private'
  return isProjectStatus(v) ? v : 'draft'
}
