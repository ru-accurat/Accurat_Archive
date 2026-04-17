import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { requireEditor } from '@/lib/api-auth'

// POST /api/tags/merge — merge source tag into target (remove duplicates)
export async function POST(request: Request) {
  const deny = await requireEditor()
  if (deny) return deny
  const supabase = createServiceClient()
  const { type, source, target } = await request.json()

  if (!type || !source || !target) {
    return NextResponse.json({ error: 'type, source, and target are required' }, { status: 400 })
  }

  const columnMap: Record<string, string> = {
    domains: 'domains',
    services: 'services',
    team: 'team',
  }

  const column = columnMap[type]
  if (!column) {
    return NextResponse.json({ error: `Invalid tag type: ${type}` }, { status: 400 })
  }

  // Get all projects containing the source tag
  const { data: projects, error } = await supabase
    .from('projects')
    .select('*')
    .contains(column, [source])

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let updated = 0
  for (const p of projects || []) {
    const arr = ((p as unknown as Record<string, unknown>)[column] as string[])
      .map(v => (v === source ? target : v))
      .filter((v, i, a) => a.indexOf(v) === i) // deduplicate

    const { error: updateError } = await supabase
      .from('projects')
      .update({ [column]: arr })
      .eq('id', p.id)

    if (!updateError) updated++
  }

  return NextResponse.json({ success: true, updated })
}
