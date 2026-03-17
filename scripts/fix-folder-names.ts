/**
 * Fixes folder names with special characters that Supabase Storage rejects.
 * - Updates folder_name in the database
 * - Re-uploads media files under the sanitized folder name
 *
 * Usage: npx tsx scripts/fix-folder-names.ts
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// Load .env.local
const envPath = path.resolve(__dirname, '../.env.local')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  for (const line of envContent.split('\n')) {
    const match = line.match(/^([^#=]+)=(.*)$/)
    if (match) process.env[match[1].trim()] = match[2].trim()
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const IMAGES_DIR = path.resolve(__dirname, '../../Images')

const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif'])
const VIDEO_EXTS = new Set(['.mp4', '.mov', '.avi', '.webm'])

/** Sanitize a name for Supabase Storage compatibility */
function sanitize(name: string): string {
  return name
    .replace(/°/g, '')
    .replace(/[—–]/g, '-')
    .replace(/['']/g, "'")
    .replace(/[""]/g, '"')
    .replace(/…/g, '...')
    .replace(/~/g, '-')
    .replace(/[?]/g, '')
    .replace(/[()]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

async function uploadFile(bucket: string, storagePath: string, localPath: string): Promise<boolean> {
  const fileBuffer = fs.readFileSync(localPath)
  const ext = path.extname(localPath).toLowerCase()
  let contentType = 'application/octet-stream'
  if (IMAGE_EXTS.has(ext)) contentType = `image/${ext === '.jpg' ? 'jpeg' : ext.slice(1)}`
  else if (VIDEO_EXTS.has(ext)) contentType = `video/${ext.slice(1)}`

  const { error } = await supabase.storage.from(bucket).upload(storagePath, fileBuffer, {
    contentType,
    upsert: true
  })

  if (error) {
    if (error.message.includes('already exists')) return true
    console.error(`  Upload error ${storagePath}: ${error.message}`)
    return false
  }
  return true
}

async function main() {
  console.log('=== Fix Folder Names ===\n')

  // Get all projects
  const { data: projects, error } = await supabase
    .from('projects')
    .select('id, folder_name')

  if (error || !projects) {
    console.error('Failed to fetch projects:', error?.message)
    return
  }

  // Find projects whose folder or media files have special chars
  const toFix = projects.filter(p => {
    const sanitized = sanitize(p.folder_name)
    return sanitized !== p.folder_name
  })

  if (toFix.length === 0) {
    console.log('No folder names need fixing.')
    return
  }

  console.log(`Found ${toFix.length} projects with special characters:\n`)

  for (const project of toFix) {
    const oldFolderName = project.folder_name
    const newFolderName = sanitize(oldFolderName)
    console.log(`  "${oldFolderName}" → "${newFolderName}"`)

    // 1. Upload media under sanitized folder AND file names
    const localFolder = path.join(IMAGES_DIR, oldFolderName)
    const fileRenameMap: Record<string, string> = {} // old filename → new filename

    if (fs.existsSync(localFolder)) {
      const files = fs.readdirSync(localFolder).filter(f => {
        const ext = path.extname(f).toLowerCase()
        return IMAGE_EXTS.has(ext) || VIDEO_EXTS.has(ext)
      })

      let uploaded = 0
      let errors = 0
      const concurrency = 5

      for (let i = 0; i < files.length; i += concurrency) {
        const batch = files.slice(i, i + concurrency)
        const results = await Promise.all(
          batch.map(file => {
            const sanitizedFile = sanitize(file)
            fileRenameMap[file] = sanitizedFile
            const localPath = path.join(localFolder, file)
            const storagePath = `${newFolderName}/${sanitizedFile}`
            return uploadFile('project-media', storagePath, localPath)
          })
        )
        for (const ok of results) {
          if (ok) uploaded++
          else errors++
        }
      }

      console.log(`  Uploaded ${uploaded} files${errors ? `, ${errors} errors` : ''}`)

      // Clean up old storage files (best effort)
      const { data: oldFiles } = await supabase.storage
        .from('project-media')
        .list(oldFolderName)

      if (oldFiles && oldFiles.length > 0) {
        const oldPaths = oldFiles.map(f => `${oldFolderName}/${f.name}`)
        await supabase.storage.from('project-media').remove(oldPaths)
        console.log(`  Cleaned up ${oldPaths.length} old storage files`)
      }
    } else {
      console.log(`  No local folder found, skipping media upload`)
    }

    // 2. Update the database: folder_name + media references
    const { data: fullProject } = await supabase
      .from('projects')
      .select('media_order, hero_image, thumb_image')
      .eq('id', project.id)
      .single()

    const updates: Record<string, unknown> = { folder_name: newFolderName }

    if (fullProject) {
      if (fullProject.media_order) {
        updates.media_order = (fullProject.media_order as string[]).map(
          f => fileRenameMap[f] || sanitize(f)
        )
      }
      if (fullProject.hero_image) {
        updates.hero_image = fileRenameMap[fullProject.hero_image] || sanitize(fullProject.hero_image)
      }
      if (fullProject.thumb_image) {
        updates.thumb_image = fileRenameMap[fullProject.thumb_image] || sanitize(fullProject.thumb_image)
      }
    }

    const { error: updateErr } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', project.id)

    if (updateErr) {
      console.error(`  DB update failed: ${updateErr.message}`)
    }
  }

  console.log('\n=== Done ===')
}

main().catch(console.error)
