import archiver from 'archiver'
import { PassThrough } from 'stream'
import type { SupabaseClient } from '@supabase/supabase-js'
import { rowToProject, type ProjectRow } from './db-utils'
import { IMAGE_EXTS, VIDEO_EXTS } from './media-types'

/** Which files to include from each project folder. */
export type ZipScope = 'all_media' | 'videos_and_gifs'

const GIF_EXT = '.gif'

function extOf(filename: string): string {
  const dot = filename.lastIndexOf('.')
  return dot < 0 ? '' : filename.slice(dot).toLowerCase()
}

function matchesScope(filename: string, scope: ZipScope): boolean {
  const ext = extOf(filename)
  if (scope === 'all_media') {
    return IMAGE_EXTS.has(ext) || VIDEO_EXTS.has(ext) || ext === GIF_EXT
  }
  // videos_and_gifs
  return VIDEO_EXTS.has(ext) || ext === GIF_EXT
}

interface BuildZipOptions {
  supabase: SupabaseClient
  projectIds: string[]
  /** If true, include a `<folder>/project.json` for each project. */
  includeJson: boolean
  /** null = include every media file (current Export ZIP behavior). */
  scope: ZipScope | null
}

/** Build a streaming ZIP from the selected projects' media. */
export function buildProjectsZip({
  supabase,
  projectIds,
  includeJson,
  scope,
}: BuildZipOptions): ReadableStream<Uint8Array> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

  const passThrough = new PassThrough()
  const archive = archiver('zip', { zlib: { level: 5 } })
  archive.pipe(passThrough)

  // Run the async fill in the background; the stream is returned immediately.
  ;(async () => {
    const { data } = await supabase
      .from('projects')
      .select('*')
      .in('id', projectIds)

    const projects = (data as ProjectRow[] | null || []).map(rowToProject)

    for (const project of projects) {
      if (includeJson) {
        archive.append(JSON.stringify(project, null, 2), {
          name: `${project.folderName}/project.json`,
        })
      }

      const { data: files } = await supabase.storage
        .from('project-media')
        .list(project.folderName)

      if (!files?.length) continue

      for (const file of files) {
        if (scope && !matchesScope(file.name, scope)) continue
        const url = `${supabaseUrl}/storage/v1/object/public/project-media/${encodeURIComponent(project.folderName)}/${encodeURIComponent(file.name)}`
        try {
          const res = await fetch(url)
          if (res.ok) {
            const buffer = Buffer.from(await res.arrayBuffer())
            archive.append(buffer, { name: `${project.folderName}/${file.name}` })
          }
        } catch {
          // skip failed downloads
        }
      }
    }

    archive.finalize()
  })().catch((err) => {
    archive.destroy(err instanceof Error ? err : new Error(String(err)))
  })

  return new ReadableStream<Uint8Array>({
    start(controller) {
      passThrough.on('data', (chunk) => controller.enqueue(chunk))
      passThrough.on('end', () => controller.close())
      passThrough.on('error', (err) => controller.error(err))
    },
  })
}
