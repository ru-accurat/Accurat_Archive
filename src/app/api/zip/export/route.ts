import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { rowToProject } from '@/lib/db-utils'
import type { ProjectRow } from '@/lib/db-utils'
import archiver from 'archiver'
import { PassThrough } from 'stream'

// POST /api/zip/export — export selected projects as ZIP with media
export async function POST(request: Request) {
  const supabase = createServiceClient()
  const { projectIds } = await request.json()

  if (!projectIds?.length) {
    return NextResponse.json({ error: 'projectIds array is required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .in('id', projectIds)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const projects = (data as ProjectRow[]).map(rowToProject)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

  // Create ZIP archive as a stream
  const passThrough = new PassThrough()
  const archive = archiver('zip', { zlib: { level: 5 } })
  archive.pipe(passThrough)

  for (const project of projects) {
    // Add project JSON
    const projectJson = JSON.stringify(project, null, 2)
    archive.append(projectJson, { name: `${project.folderName}/project.json` })

    // List and download media files
    const { data: files } = await supabase.storage
      .from('project-media')
      .list(project.folderName)

    if (files?.length) {
      for (const file of files) {
        const url = `${supabaseUrl}/storage/v1/object/public/project-media/${encodeURIComponent(project.folderName)}/${encodeURIComponent(file.name)}`
        try {
          const res = await fetch(url)
          if (res.ok) {
            const buffer = Buffer.from(await res.arrayBuffer())
            archive.append(buffer, { name: `${project.folderName}/${file.name}` })
          }
        } catch {
          // Skip failed downloads
        }
      }
    }
  }

  archive.finalize()

  // Convert Node stream to web ReadableStream
  const readable = new ReadableStream({
    start(controller) {
      passThrough.on('data', (chunk) => controller.enqueue(chunk))
      passThrough.on('end', () => controller.close())
      passThrough.on('error', (err) => controller.error(err))
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': 'attachment; filename="accurat-archive-export.zip"',
    },
  })
}
