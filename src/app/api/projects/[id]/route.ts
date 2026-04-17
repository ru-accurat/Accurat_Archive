import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { rowToProject, projectToRow } from '@/lib/db-utils'
import type { ProjectRow } from '@/lib/db-utils'
import { logActivity } from '@/lib/activity'
import { requireEditor, requireRole } from '@/lib/api-auth'

// GET /api/projects/[id]
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  return NextResponse.json(rowToProject(data as ProjectRow))
}

// PATCH /api/projects/[id]
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const deny = await requireEditor()
  if (deny) return deny
  const { id } = await params
  const supabase = createServiceClient()
  const body = await request.json()

  // Save history snapshot before updating
  const { data: current } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single()

  if (current) {
    await supabase.from('project_history').insert({
      project_id: id,
      snapshot: current,
    })
  }

  const row = projectToRow(body)
  const { data, error } = await supabase
    .from('projects')
    .update(row)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const project = rowToProject(data as ProjectRow)
  await logActivity('project.updated', { projectName: project.fullName, fields: Object.keys(body) }, id)

  return NextResponse.json(project)
}

// DELETE /api/projects/[id]
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const deny = await requireRole(['admin'])
  if (deny) return deny
  const { id } = await params
  const supabase = createServiceClient()

  // Get folder name to delete media
  const { data: project } = await supabase
    .from('projects')
    .select('folder_name')
    .eq('id', id)
    .single()

  if (project?.folder_name) {
    // Delete all media for this project
    const { data: files } = await supabase.storage
      .from('project-media')
      .list(project.folder_name)
    if (files?.length) {
      const paths = files.map(f => `${project.folder_name}/${f.name}`)
      await supabase.storage.from('project-media').remove(paths)
    }
  }

  const projectName = project?.folder_name || id
  const { error } = await supabase.from('projects').delete().eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await logActivity('project.deleted', { projectName }, id)

  return NextResponse.json({ success: true })
}
