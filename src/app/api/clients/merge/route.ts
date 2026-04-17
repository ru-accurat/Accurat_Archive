import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { requireBusinessAccess } from '@/lib/api-auth'

// POST /api/clients/merge
// Merge source client into target client:
// - Move all engagements from source to target
// - Move all projects from source to target
// - Add source name + aliases to target aliases
// - Delete source client
export async function POST(request: Request) {
  const deny = await requireBusinessAccess()
  if (deny) return deny
  const supabase = createServiceClient()
  const { sourceId, targetId } = await request.json()

  if (!sourceId || !targetId || sourceId === targetId) {
    return NextResponse.json({ error: 'sourceId and targetId required and must differ' }, { status: 400 })
  }

  // Get both clients
  const { data: source } = await supabase.from('clients').select('*').eq('id', sourceId).single()
  const { data: target } = await supabase.from('clients').select('*').eq('id', targetId).single()

  if (!source || !target) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  }

  // Move engagements from source to target
  const { data: movedEngagements } = await supabase
    .from('engagements')
    .update({ client_id: targetId })
    .eq('client_id', sourceId)
    .select('id')

  // Move projects from source to target
  const { data: movedProjects } = await supabase
    .from('projects')
    .update({ client_id: targetId })
    .eq('client_id', sourceId)
    .select('id')

  // Add source name and aliases to target's aliases (deduped)
  const newAliases = new Set<string>([
    ...(target.aliases || []),
    source.name,
    ...(source.aliases || []),
  ])
  // Remove target's own name from aliases
  newAliases.delete(target.name)

  await supabase
    .from('clients')
    .update({ aliases: [...newAliases] })
    .eq('id', targetId)

  // Delete source client
  await supabase.from('clients').delete().eq('id', sourceId)

  return NextResponse.json({
    success: true,
    movedEngagements: movedEngagements?.length || 0,
    movedProjects: movedProjects?.length || 0,
    targetName: target.name,
  })
}
