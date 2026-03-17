import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

// DELETE /api/projects/[id]/media/[filename]
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; filename: string }> }
) {
  const { id, filename } = await params
  const supabase = createServiceClient()

  const { data: project } = await supabase
    .from('projects')
    .select('folder_name')
    .eq('id', id)
    .single()

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  const storagePath = `${project.folder_name}/${decodeURIComponent(filename)}`
  const { error } = await supabase.storage.from('project-media').remove([storagePath])

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
