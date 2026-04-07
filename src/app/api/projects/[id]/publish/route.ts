import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { logActivity } from '@/lib/activity'

// POST /api/projects/[id]/publish
// Snapshots the current case-study fields into published_version and sets published_at.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
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
    section: current.section,
    status: current.status,
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

  await logActivity('project.updated', { projectName: current.full_name, fields: ['published_version'] }, id)

  return NextResponse.json({ success: true, publishedAt })
}
