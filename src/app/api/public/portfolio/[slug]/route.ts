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

  const row = (data as ProjectRow[]).find((r) => toSlug(r.full_name) === slug)

  if (!row) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  const project = rowToProject(row)

  if (row.published_version) {
    const pv = row.published_version as Record<string, unknown>
    Object.assign(project, {
      projectName: (pv.name as string) ?? project.projectName,
      client: (pv.client as string) ?? project.client,
      fullName: (pv.full_name as string) ?? project.fullName,
      tagline: (pv.tagline as string) ?? project.tagline,
      description: (pv.description as string) ?? project.description,
      challenge: (pv.challenge as string) ?? project.challenge,
      solution: (pv.solution as string) ?? project.solution,
      deliverables: (pv.deliverables as string) ?? project.deliverables,
      clientQuotes: (pv.client_quotes as string) ?? project.clientQuotes,
      domains: (pv.domains as string[]) ?? project.domains,
      services: (pv.services as string[]) ?? project.services,
      tier: (pv.tier as number) ?? project.tier,
      section: (pv.section as string) ?? project.section,
      status: (pv.status as 'draft' | 'internal' | 'public') ?? project.status,
      output: (pv.output as string) ?? project.output,
    })
  }

  return NextResponse.json(project)
}
