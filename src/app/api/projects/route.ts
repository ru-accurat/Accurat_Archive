import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { rowToProject, projectToRow } from '@/lib/db-utils'
import type { ProjectRow } from '@/lib/db-utils'

// GET /api/projects — list all projects
export async function GET() {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('client', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const projects = (data as ProjectRow[]).map(rowToProject)
  return NextResponse.json(projects, {
    headers: {
      'Cache-Control': 'private, max-age=30, stale-while-revalidate=300',
    },
  })
}

// POST /api/projects — create a new project
export async function POST(request: Request) {
  const supabase = createServiceClient()
  const body = await request.json()
  const { client, projectName } = body

  if (!client || !projectName) {
    return NextResponse.json({ error: 'client and projectName are required' }, { status: 400 })
  }

  const id = `${client}-${projectName}`.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  const folderName = `${client} - ${projectName}`

  const row = projectToRow({
    id,
    fullName: `${client} — ${projectName}`,
    client,
    projectName,
    tier: 3,
    section: '',
    start: null,
    end: null,
    domains: [],
    services: [],
    tagline: '',
    description: '',
    challenge: '',
    solution: '',
    deliverables: '',
    clientQuotes: '',
    team: [],
    urls: [],
    output: '',
    folderName,
  })

  const { data, error } = await supabase
    .from('projects')
    .insert(row)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(rowToProject(data as ProjectRow))
}
