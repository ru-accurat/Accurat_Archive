import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import sharp from 'sharp'

// POST /api/ai/generate-inuse/accept
export async function POST(request: Request) {
  const supabase = createServiceClient()
  const { projectId, imageBase64, imageMimeType, setAsThumbnail } = await request.json()

  if (!projectId || !imageBase64) {
    return NextResponse.json({ error: 'projectId and imageBase64 required' }, { status: 400 })
  }

  // Get project
  const { data: project } = await supabase
    .from('projects')
    .select('folder_name, media_order, thumb_image')
    .eq('id', projectId)
    .single()

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  // Decode base64 image
  const sourceBuffer = Buffer.from(imageBase64, 'base64')

  // Compress to max 150KB using sharp — convert to WebP with decreasing quality
  const MAX_SIZE = 150 * 1024 // 150KB
  let quality = 85
  let finalBuffer: Buffer<ArrayBuffer> = await sharp(sourceBuffer).webp({ quality }).toBuffer() as Buffer<ArrayBuffer>

  while (finalBuffer.length > MAX_SIZE && quality > 20) {
    quality -= 10
    finalBuffer = await sharp(sourceBuffer).webp({ quality }).toBuffer() as Buffer<ArrayBuffer>
  }

  // If still too large, also resize
  if (finalBuffer.length > MAX_SIZE) {
    finalBuffer = await sharp(sourceBuffer)
      .resize({ width: 1600, withoutEnlargement: true })
      .webp({ quality: 30 })
      .toBuffer() as Buffer<ArrayBuffer>
  }
  const filename = `_inuse_${Date.now()}.webp`
  const storagePath = `${project.folder_name}/${filename}`

  // Upload to Supabase storage
  const { error: uploadError } = await supabase.storage
    .from('project-media')
    .upload(storagePath, finalBuffer, {
      contentType: 'image/webp',
      upsert: true,
    })

  if (uploadError) {
    return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 })
  }

  // Update project: append to media_order
  const currentOrder = project.media_order || []
  const newOrder = [...currentOrder, filename]
  const updateData: Record<string, unknown> = { media_order: newOrder }

  if (setAsThumbnail) {
    updateData.thumb_image = filename
  }

  const { error: updateError } = await supabase
    .from('projects')
    .update(updateData)
    .eq('id', projectId)

  if (updateError) {
    return NextResponse.json({ error: `DB update failed: ${updateError.message}` }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    filename,
    size: finalBuffer.length,
    setAsThumbnail: !!setAsThumbnail,
  })
}

export const maxDuration = 60
