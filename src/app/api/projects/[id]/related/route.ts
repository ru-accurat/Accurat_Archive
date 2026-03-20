import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { rowToProject } from '@/lib/db-utils'
import type { ProjectRow } from '@/lib/db-utils'

// GET /api/projects/[id]/related — returns up to 5 similar projects
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceClient()

  const { data: current } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single()

  if (!current) {
    return NextResponse.json([])
  }

  const { data: allProjects } = await supabase
    .from('projects')
    .select('*')
    .neq('id', id)

  if (!allProjects?.length) {
    return NextResponse.json([])
  }

  // Score similarity based on shared domains, services, client, and output
  const scored = allProjects.map((row) => {
    let score = 0
    const domains = row.domains || []
    const services = row.services || []
    const curDomains = current.domains || []
    const curServices = current.services || []

    // Shared domains (weight: 3)
    for (const d of domains) {
      if (curDomains.includes(d)) score += 3
    }
    // Shared services (weight: 2)
    for (const s of services) {
      if (curServices.includes(s)) score += 2
    }
    // Same client (weight: 4)
    if (row.client === current.client) score += 4
    // Same output/category (weight: 1)
    if (row.output === current.output && row.output) score += 1
    // Same section (weight: 1)
    if (row.section === current.section && row.section) score += 1

    return { row, score }
  })

  const top = scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((s) => rowToProject(s.row as ProjectRow))

  return NextResponse.json(top)
}
