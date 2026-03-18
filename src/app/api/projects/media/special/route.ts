import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { IMAGE_EXTS } from '@/lib/media-types'

// GET /api/projects/media/special?folder=FolderName  — single project (with storage listing)
// GET /api/projects/media/special                     — all projects (fast, DB-only)
export async function GET(request: Request) {
  const supabase = createServiceClient()
  const { searchParams } = new URL(request.url)
  const folder = searchParams.get('folder')

  if (folder) {
    const result = await getSpecialMedia(supabase, folder)
    return NextResponse.json(result)
  }

  // All projects — use DB fields only (no storage list calls)
  const { data: projects, error } = await supabase
    .from('projects')
    .select('id, folder_name, hero_image, thumb_image, media_order')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const result: Record<string, { header: string | null; thumb: string | null; first: string | null }> = {}
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

  const makeUrl = (folderName: string, filename: string) =>
    `${supabaseUrl}/storage/v1/object/public/project-media/${encodeURIComponent(folderName)}/${encodeURIComponent(filename)}`

  for (const p of projects || []) {
    // Use media_order[0] as "first" image if available
    const firstFile = (p.media_order as string[] | null)?.find(f => {
      const ext = '.' + f.split('.').pop()?.toLowerCase()
      return IMAGE_EXTS.has(ext)
    })

    const entry = {
      header: p.hero_image ? makeUrl(p.folder_name, p.hero_image) : null,
      thumb: p.thumb_image ? makeUrl(p.folder_name, p.thumb_image) : null,
      first: firstFile ? makeUrl(p.folder_name, firstFile) : null,
    }
    // Key by both folder_name (grid) and id (table)
    result[p.folder_name] = entry
    result[p.id] = entry
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
    return IMAGE_EXTS.has(ext)
  })

  const makeUrl = (filename: string) =>
    `${supabaseUrl}/storage/v1/object/public/project-media/${encodeURIComponent(folder)}/${encodeURIComponent(filename)}`

  const headerFile = imageFiles.find(f => f.name.toLowerCase().startsWith('_header'))
  const thumbFile = imageFiles.find(f => f.name.toLowerCase().startsWith('_thumb'))
  const firstImage = imageFiles[0]

  return {
    header: headerFile ? makeUrl(headerFile.name) : null,
    thumb: thumbFile ? makeUrl(thumbFile.name) : null,
    first: firstImage ? makeUrl(firstImage.name) : null,
  }
}
