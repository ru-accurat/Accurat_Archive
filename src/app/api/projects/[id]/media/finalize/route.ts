import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { MEDIA_EXTS } from '@/lib/media-types'
import sharp from 'sharp'

// Extensions that need conversion to WebP for universal browser support
const CONVERT_EXTS = new Set(['.heic', '.heif', '.avif', '.tiff', '.tif', '.bmp'])

// POST /api/projects/[id]/media/finalize
// Called after direct-to-Supabase uploads complete.
// 1. Converts non-web-friendly images (HEIC, AVIF, TIFF, BMP) to WebP
// 2. Syncs media_order in DB
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServiceClient()

  const { data: project } = await supabase
    .from('projects')
    .select('folder_name, hero_image')
    .eq('id', id)
    .single()

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  const folder = project.folder_name

  // List all files in the project folder
  const { data: allFiles } = await supabase.storage
    .from('project-media')
    .list(folder, { sortBy: { column: 'name', order: 'asc' } })

  if (!allFiles) {
    return NextResponse.json({ error: 'Failed to list files' }, { status: 500 })
  }

  // Convert non-web-friendly images to WebP
  let converted = 0
  for (const file of allFiles) {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!CONVERT_EXTS.has(ext)) continue

    try {
      // Download the original
      const { data: blob, error: dlError } = await supabase.storage
        .from('project-media')
        .download(`${folder}/${file.name}`)

      if (dlError || !blob) continue

      const buffer = Buffer.from(await blob.arrayBuffer())

      // Convert to WebP using Sharp
      const webpBuffer = await sharp(buffer)
        .webp({ quality: 85 })
        .toBuffer()

      // Upload the WebP version
      const baseName = file.name.replace(/\.[^.]+$/, '')
      const webpName = `${baseName}.webp`

      const { error: upError } = await supabase.storage
        .from('project-media')
        .upload(`${folder}/${webpName}`, webpBuffer, {
          contentType: 'image/webp',
          upsert: true,
        })

      if (!upError) {
        // Remove the original
        await supabase.storage
          .from('project-media')
          .remove([`${folder}/${file.name}`])
        converted++
      }
    } catch (err) {
      console.error(`Failed to convert ${file.name}:`, err)
      // Keep the original if conversion fails
    }
  }

  // Re-list files after conversions
  const { data: finalFiles } = await supabase.storage
    .from('project-media')
    .list(folder, { sortBy: { column: 'name', order: 'asc' } })

  const mediaOrder = (finalFiles || [])
    .filter(f => {
      const ext = '.' + f.name.split('.').pop()?.toLowerCase()
      return MEDIA_EXTS.has(ext)
    })
    .map(f => f.name)

  const updates: Record<string, unknown> = { media_order: mediaOrder }

  // Fix hero_image reference if it was converted
  if (project.hero_image) {
    const heroExt = '.' + project.hero_image.split('.').pop()?.toLowerCase()
    if (CONVERT_EXTS.has(heroExt)) {
      const newHero = project.hero_image.replace(/\.[^.]+$/, '.webp')
      if (mediaOrder.includes(newHero)) {
        updates.hero_image = newHero
      }
    }
  }

  // Set hero_image if not already set
  if (!project.hero_image && mediaOrder.length > 0) {
    updates.hero_image = mediaOrder[0]
  }

  await supabase.from('projects').update(updates).eq('id', id)

  return NextResponse.json({
    success: true,
    mediaCount: mediaOrder.length,
    converted,
  })
}
