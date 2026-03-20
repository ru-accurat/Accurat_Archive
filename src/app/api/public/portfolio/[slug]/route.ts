import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { rowToProject } from '@/lib/db-utils'
import type { ProjectRow } from '@/lib/db-utils'
import { toSlug } from '@/lib/slug'

// GET /api/public/portfolio/[slug] — single public project by slug
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('status', 'public')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Match by slug derived from full_name
  const row = (data as ProjectRow[]).find((r) => toSlug(r.full_name) === slug)

  if (!row) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  return NextResponse.json(rowToProject(row))
}
