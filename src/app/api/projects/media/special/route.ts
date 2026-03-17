import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

const IMAGE_EXTS = ['.png', '.jpg', '.jpeg', '.webp', '.gif']

// GET /api/projects/media/special?folder=FolderName
// GET /api/projects/media/special (all projects)
export async function GET(request: Request) {
  const supabase = createServiceClient()
  const { searchParams } = new URL(request.url)
  const folder = searchParams.get('folder')

  if (folder) {
    // Single project's special media
    const result = await getSpecialMedia(supabase, folder)
    return NextResponse.json(result)
  }

  // All projects' special media
  const { data: projects, error } = await supabase
    .from('projects')
    .select('id, folder_name, hero_image, thumb_image')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const result: Record<string, { header: string | null; thumb: string | null; first: string | null }> = {}
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

  for (const p of projects || []) {
    const { data: files } = await supabase.storage
      .from('project-media')
      .list(p.folder_name, { limit: 10, sortBy: { column: 'name', order: 'asc' } })

    const imageFiles = (files || []).filter(f => {
      const ext = '.' + f.name.split('.').pop()?.toLowerCase()
      return IMAGE_EXTS.includes(ext)
    })

    const makeUrl = (filename: string) =>
      `${supabaseUrl}/storage/v1/object/public/project-media/${encodeURIComponent(p.folder_name)}/${encodeURIComponent(filename)}`

    const headerFile = imageFiles.find(f => f.name.toLowerCase().startsWith('_header'))
    const thumbFile = imageFiles.find(f => f.name.toLowerCase().startsWith('_thumb'))
    const firstImage = imageFiles[0]

    result[p.id] = {
      header: p.hero_image ? makeUrl(p.hero_image) : headerFile ? makeUrl(headerFile.name) : null,
      thumb: p.thumb_image ? makeUrl(p.thumb_image) : thumbFile ? makeUrl(thumbFile.name) : null,
      first: firstImage ? makeUrl(firstImage.name) : null,
    }
  }

  return NextResponse.json(result)
}

async function getSpecialMedia(supabase: ReturnType<typeof createServiceClient>, folder: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

  const { data: files } = await supabase.storage
    .from('project-media')
    .list(folder, { limit: 10, sortBy: { column: 'name', order: 'asc' } })

  const imageFiles = (files || []).filter(f => {
    const ext = '.' + f.name.split('.').pop()?.toLowerCase()
    return IMAGE_EXTS.includes(ext)
  })

  const makeUrl = (filename: string) =>
    `${supabaseUrl}/storage/v1/object/public/project-media/${encodeURIComponent(folder)}/${encodeURIComponent(filename)}`

  const headerFile = imageFiles.find(f => f.name.toLowerCase().startsWith('_header'))
  const thumbFile = imageFiles.find(f => f.name.toLowerCase().startsWith('_thumb'))

  return {
    header: headerFile ? makeUrl(headerFile.name) : null,
    thumb: thumbFile ? makeUrl(thumbFile.name) : null,
  }
}
