import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { rowToProject } from '@/lib/db-utils'
import type { ProjectRow } from '@/lib/db-utils'

// GET /api/public/portfolio — list public projects
export async function GET() {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('status', 'public')
    .order('tier', { ascending: true })
    .order('client', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const projects = (data as ProjectRow[]).map(rowToProject)

  return NextResponse.json(projects)
}
