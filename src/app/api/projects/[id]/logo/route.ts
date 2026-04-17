import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { requireEditor } from '@/lib/api-auth'

// POST /api/projects/[id]/logo — upload client logo (SVG)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const deny = await requireEditor()
  if (deny) return deny
  const { id } = await params
  const supabase = createServiceClient()

  const { data: project } = await supabase
    .from('projects')
    .select('client')
    .eq('id', id)
    .single()

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  const formData = await request.formData()
  const file = formData.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  // Use client name as logo filename for consistency
  const ext = file.name.split('.').pop()?.toLowerCase() || 'svg'
  const logoFilename = `${project.client.replace(/[^a-zA-Z0-9\s-]/g, '').trim()}.${ext}`

  const buffer = Buffer.from(await file.arrayBuffer())
  const { error: uploadError } = await supabase.storage
    .from('logos')
    .upload(logoFilename, buffer, {
      contentType: file.type || 'image/svg+xml',
      upsert: true,
    })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  // Update the project's client_logo field
  await supabase
    .from('projects')
    .update({ client_logo: logoFilename })
    .eq('id', id)

  return NextResponse.json({ success: true, filename: logoFilename })
}

// DELETE /api/projects/[id]/logo — remove client logo
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const deny = await requireEditor()
  if (deny) return deny
  const { id } = await params
  const supabase = createServiceClient()

  const { data: project } = await supabase
    .from('projects')
    .select('client_logo')
    .eq('id', id)
    .single()

  if (!project?.client_logo) {
    return NextResponse.json({ error: 'No logo to delete' }, { status: 404 })
  }

  // Remove from storage
  await supabase.storage.from('logos').remove([project.client_logo])

  // Clear the field
  await supabase
    .from('projects')
    .update({ client_logo: null })
    .eq('id', id)

  return NextResponse.json({ success: true })
}
