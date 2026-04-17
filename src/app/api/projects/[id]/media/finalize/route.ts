import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { MEDIA_EXTS } from '@/lib/media-types'
import { normalizeFolderFiles } from '@/lib/media-naming'
import sharp from 'sharp'
import { requireEditor } from '@/lib/api-auth'

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
  const deny = await requireEditor()
  if (deny) return deny
  const { id } = await params
  const supabase = createServiceClient()

  const { data: project } = await supabase
    .from('projects')
    .select('folder_name, hero_image, thumb_image, media_order')
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

  // Normalize file names to the convention {folder}_{NN}.{ext}.
  // Files already conforming are left untouched.
  const renames = await normalizeFolderFiles(supabase, folder)
  const remap = (name: string | null | undefined): string | null | undefined => {
    if (!name) return name
    return renames[name] ?? name
  }

  // Re-list files after conversions + renames
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
  let currentHero = project.hero_image as string | null | undefined
  if (currentHero) {
    const heroExt = '.' + currentHero.split('.').pop()?.toLowerCase()
    if (CONVERT_EXTS.has(heroExt)) {
      const newHero = currentHero.replace(/\.[^.]+$/, '.webp')
      currentHero = newHero
    }
  }
  // Apply rename remap to hero/thumb
  const remappedHero = remap(currentHero)
  if (remappedHero && remappedHero !== project.hero_image && mediaOrder.includes(remappedHero)) {
    updates.hero_image = remappedHero
  }
  const remappedThumb = remap(project.thumb_image as string | null | undefined)
  if (remappedThumb && remappedThumb !== project.thumb_image && mediaOrder.includes(remappedThumb)) {
    updates.thumb_image = remappedThumb
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
