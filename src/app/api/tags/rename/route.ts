import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

// POST /api/tags/rename — rename a tag value across all projects
export async function POST(request: Request) {
  const supabase = createServiceClient()
  const { type, oldValue, newValue } = await request.json()

  if (!type || !oldValue || !newValue) {
    return NextResponse.json({ error: 'type, oldValue, and newValue are required' }, { status: 400 })
  }

  // Map tag type to column name
  const columnMap: Record<string, string> = {
    domains: 'domains',
    services: 'services',
    team: 'team',
  }

  const column = columnMap[type]
  if (!column) {
    return NextResponse.json({ error: `Invalid tag type: ${type}` }, { status: 400 })
  }

  // Get all projects that contain the old value
  const { data: projects, error } = await supabase
    .from('projects')
    .select('*')
    .contains(column, [oldValue])

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let updated = 0
  for (const p of projects || []) {
    const arr = ((p as unknown as Record<string, unknown>)[column] as string[]).map(v => (v === oldValue ? newValue : v))
    const { error: updateError } = await supabase
      .from('projects')
      .update({ [column]: arr })
      .eq('id', p.id)

    if (!updateError) updated++
  }

  return NextResponse.json({ success: true, updated })
}
