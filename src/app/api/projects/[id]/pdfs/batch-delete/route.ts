import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { filenames } = await request.json() as { filenames: string[] }

  if (!Array.isArray(filenames) || filenames.length === 0) {
    return NextResponse.json({ error: 'No filenames provided' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { data: project } = await supabase
    .from('projects')
    .select('folder_name, pdf_files')
    .eq('id', id)
    .single()

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  const paths = filenames.map(f => `${project.folder_name}/${f}`)
  const { error } = await supabase.storage.from('project-pdfs').remove(paths)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const deleteSet = new Set(filenames)
  const updatedPdfs = (project.pdf_files || []).filter((f: string) => !deleteSet.has(f))
  await supabase.from('projects').update({ pdf_files: updatedPdfs }).eq('id', id)

  return NextResponse.json({ success: true, deleted: filenames.length })
}
