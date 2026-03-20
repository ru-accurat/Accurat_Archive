import { createServiceClient } from '@/lib/supabase'

export type ActivityAction =
  | 'project.created'
  | 'project.updated'
  | 'project.deleted'
  | 'media.uploaded'
  | 'media.deleted'
  | 'media.reordered'
  | 'logo.uploaded'
  | 'logo.deleted'
  | 'pdf.uploaded'
  | 'pdf.deleted'
  | 'ai.generated'
  | 'tags.merged'
  | 'tags.renamed'

export async function logActivity(
  action: ActivityAction,
  details: Record<string, unknown> = {},
  projectId?: string
) {
  try {
    const supabase = createServiceClient()
    await supabase.from('activity_log').insert({
      action,
      project_id: projectId || null,
      details,
    })
  } catch {
    // Activity logging should never block the main operation
  }
}
