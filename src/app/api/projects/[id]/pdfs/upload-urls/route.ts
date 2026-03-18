import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

const MAX_FILE_SIZE = 150 * 1024 * 1024 // 150 MB

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { files } = await request.json() as {
    files: { name: string; size: number; type: string }[]
  }

  if (!Array.isArray(files) || files.length === 0) {
    return NextResponse.json({ error: 'No files provided' }, { status: 400 })
  }

  const oversized = files.filter(f => f.size > MAX_FILE_SIZE)
  if (oversized.length > 0) {
    return NextResponse.json({
      error: `Files exceed 150MB limit: ${oversized.map(f => f.name).join(', ')}`
    }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { data: project } = await supabase
    .from('projects')
    .select('folder_name')
    .eq('id', id)
    .single()

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  const urls: { name: string; url: string; path: string }[] = []

  for (const file of files) {
    const storagePath = `${project.folder_name}/${file.name}`

    const { data, error } = await supabase.storage
      .from('project-pdfs')
      .createSignedUploadUrl(storagePath, { upsert: true })

    if (error) {
      return NextResponse.json({
        error: `Failed to create upload URL for ${file.name}: ${error.message}`
      }, { status: 500 })
    }

    urls.push({ name: file.name, url: data.signedUrl, path: data.path })
  }

  return NextResponse.json({ urls })
}
