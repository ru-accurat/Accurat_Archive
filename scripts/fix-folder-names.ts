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

  // Find projects that need fixing
  const toFix = projects.filter(p => {
    const sanitized = sanitizeFolder(p.folder_name)
    return sanitized !== p.folder_name
  })

  if (toFix.length === 0) {
    console.log('No folder names need fixing.')
    return
  }

  console.log(`Found ${toFix.length} projects with special characters:\n`)

  for (const project of toFix) {
    const oldName = project.folder_name
    const newName = sanitizeFolder(oldName)
    console.log(`  "${oldName}" → "${newName}"`)

    // 1. Update the database
    const { error: updateErr } = await supabase
      .from('projects')
      .update({ folder_name: newName })
      .eq('id', project.id)

    if (updateErr) {
      console.error(`  DB update failed: ${updateErr.message}`)
      continue
    }

    // 2. Upload media under the new folder name
    const localFolder = path.join(IMAGES_DIR, oldName)
    if (!fs.existsSync(localFolder)) {
      console.log(`  No local folder found, skipping media upload`)
      continue
    }

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
          const localPath = path.join(localFolder, file)
          const storagePath = `${newName}/${file}`
          return uploadFile('project-media', storagePath, localPath)
        })
      )
      for (const ok of results) {
        if (ok) uploaded++
        else errors++
      }
    }

    console.log(`  Uploaded ${uploaded} files${errors ? `, ${errors} errors` : ''}`)

    // 3. Try to remove old files from storage (best effort)
    const { data: oldFiles } = await supabase.storage
      .from('project-media')
      .list(oldName)

    if (oldFiles && oldFiles.length > 0) {
      const oldPaths = oldFiles.map(f => `${oldName}/${f.name}`)
      await supabase.storage.from('project-media').remove(oldPaths)
      console.log(`  Cleaned up ${oldPaths.length} old storage files`)
    }
  }

  console.log('\n=== Done ===')
}

main().catch(console.error)
