import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import Papa from 'papaparse'

function toSlug(fullName: string): string {
  return fullName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

// POST /api/csv/parse — parse a CSV file, match rows to existing projects
export async function POST(request: Request) {
  const formData = await request.formData()
  const file = formData.get('file')

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  const text = await file.text()
  const { data, errors, meta } = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  })

  if (errors.length > 0) {
    console.warn('CSV parse warnings:', errors.slice(0, 5))
  }

  // Fetch existing projects for matching
  const supabase = createServiceClient()
  const { data: projects } = await supabase
    .from('projects')
    .select('id, full_name, client, project_name')

  const matches: { rowIndex: number; projectId: string; projectFullName: string; matchType: string }[] = []

  if (projects) {
    // Build lookup maps
    const byFullName = new Map<string, { id: string; full_name: string }>()
    const bySlug = new Map<string, { id: string; full_name: string }>()
    const byClientProject = new Map<string, { id: string; full_name: string }>()

    for (const p of projects) {
      byFullName.set(p.full_name, p)
      bySlug.set(toSlug(p.full_name), p)
      const key = `${(p.client || '').trim().toLowerCase()}|${(p.project_name || '').trim().toLowerCase()}`
      byClientProject.set(key, p)
    }

    for (let i = 0; i < data.length; i++) {
      const row = data[i]
      const fullName = (row['Full Name'] || '').trim()
      const client = (row['Client'] || '').trim()
      const projectName = (row['Project Name'] || '').trim()

      // Try exact full name match
      let match = byFullName.get(fullName)
      let matchType = 'fullName'

      // Try slug match
      if (!match && fullName) {
        match = bySlug.get(toSlug(fullName))
        matchType = 'slug'
      }

      // Try client + project name match
      if (!match && client && projectName) {
        const key = `${client.toLowerCase()}|${projectName.toLowerCase()}`
        match = byClientProject.get(key)
        matchType = 'clientProject'
      }

      if (match) {
        matches.push({
          rowIndex: i,
          projectId: match.id,
          projectFullName: match.full_name,
          matchType,
        })
      }
    }
  }

  return NextResponse.json({
    headers: meta.fields || [],
    rows: data,
    rowCount: data.length,
    matches,
    totalProjects: projects?.length || 0,
  })
}
