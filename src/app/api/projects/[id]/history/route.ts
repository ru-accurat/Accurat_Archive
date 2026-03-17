import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { rowToProject } from '@/lib/db-utils'
import type { ProjectRow } from '@/lib/db-utils'
import type { HistoryEntry } from '@/lib/types'

// GET /api/projects/[id]/history
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('project_history')
    .select('*')
    .eq('project_id', id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const entries: HistoryEntry[] = (data || []).map(row => ({
    timestamp: row.created_at,
    project: rowToProject(row.snapshot as ProjectRow),
  }))

  return NextResponse.json(entries)
}
