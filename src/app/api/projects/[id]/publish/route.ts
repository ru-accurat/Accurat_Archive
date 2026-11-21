import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { logActivity } from '@/lib/activity'
import { requireEditor } from '@/lib/api-auth'
import { applyStatusChange } from '@/lib/project-status-server'
import { normalizeStatus } from '@/lib/status'

// POST /api/projects/[id]/publish
// 1. Snapshot the current case-study content fields into `published_version` with a
//    `published_at` timestamp (shared links and the public portfolio freeze at this version).
// 2. A Draft becomes Archive only. Publishing never puts a project on the website: that is a
//    deliberate status choice (Public or Private), with its own checks.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const deny = await requireEditor()
  if (deny) return deny
  const { id } = await params
  const supabase = createServiceClient()

  const { data: current, error: fetchError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError || !current) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  let status = normalizeStatus(current.status)
  if (status === 'draft') {
    try {
      const result = await applyStatusChange(supabase, [id], 'archive_only', 'Archive app: published, Draft becomes Archive only')
      if (result.skipped.length > 0) {
        return NextResponse.json({ error: `${result.skipped[0].reason}. Nothing published.` }, { status: 409 })
      }
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
    }
    status = 'archive_only'
  }

  // Only snapshot case-study content fields (text + tags + metadata).
  // Exclude media fields, timestamps, tokens, and published_version itself.
  const snapshot = {
    name: current.project_name,
    client: current.client,
    full_name: current.full_name,
    tagline: current.tagline,
    description: current.description,
    challenge: current.challenge,
    solution: current.solution,
    deliverables: current.deliverables,
    client_quotes: current.client_quotes,
    domains: current.domains,
    services: current.services,
    tier: current.tier,
    status,
    output: current.output,
  }

  const publishedAt = new Date().toISOString()

  const { error: updateError } = await supabase
    .from('projects')
    .update({ published_version: snapshot, published_at: publishedAt })
    .eq('id', id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  await logActivity(
    'project.updated',
    { projectName: current.full_name, fields: ['published_version'], status },
    id
  )

  return NextResponse.json({ success: true, publishedAt, status })
}
