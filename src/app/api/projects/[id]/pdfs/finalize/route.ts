import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServiceClient()

  const { data: project } = await supabase
    .from('projects')
    .select('folder_name')
    .eq('id', id)
    .single()

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  const { data: files } = await supabase.storage
    .from('project-pdfs')
    .list(project.folder_name, { sortBy: { column: 'name', order: 'asc' } })

  const pdfFiles = (files || [])
    .filter(f => f.name.toLowerCase().endsWith('.pdf'))
    .map(f => f.name)

  await supabase.from('projects').update({ pdf_files: pdfFiles }).eq('id', id)

  return NextResponse.json({ success: true, count: pdfFiles.length })
}
