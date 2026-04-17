import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { requireEditor } from '@/lib/api-auth'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const deny = await requireEditor()
  if (deny) return deny
  const { id } = await params
  const { oldName, newName } = await request.json() as { oldName: string; newName: string }

  if (!oldName || !newName) {
    return NextResponse.json({ error: 'oldName and newName required' }, { status: 400 })
  }

  // Ensure .pdf extension
  const finalName = newName.endsWith('.pdf') ? newName : `${newName}.pdf`

  const supabase = createServiceClient()

  const { data: project } = await supabase
    .from('projects')
    .select('folder_name, pdf_files')
    .eq('id', id)
    .single()

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  const folder = project.folder_name
  const oldPath = `${folder}/${oldName}`
  const newPath = `${folder}/${finalName}`

  // Copy to new name
  const { error: copyError } = await supabase.storage
    .from('project-pdfs')
    .copy(oldPath, newPath)

  if (copyError) {
    return NextResponse.json({ error: `Copy failed: ${copyError.message}` }, { status: 500 })
  }

  // Delete old
  await supabase.storage.from('project-pdfs').remove([oldPath])

  // Update pdf_files array in DB
  const updatedPdfs = (project.pdf_files || []).map((f: string) =>
    f === oldName ? finalName : f
  )
  await supabase.from('projects').update({ pdf_files: updatedPdfs }).eq('id', id)

  return NextResponse.json({ success: true, filename: finalName })
}
