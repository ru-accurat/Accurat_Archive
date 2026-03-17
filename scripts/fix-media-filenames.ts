/**
 * Re-uploads media for projects whose files have special characters in names.
 * The folder_name in DB is already sanitized; this fixes the actual file uploads.
 *
 * Usage: npx tsx scripts/fix-media-filenames.ts
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

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

// These are the original folder names (on disk) for projects that had special chars
// and whose media upload failed because filenames also had special chars
const AFFECTED_PROJECTS = [
  { diskFolder: 'ARCHIVIO - N°9—The Fashion Issue', dbFolder: 'ARCHIVIO - N9-The Fashion Issue' },
  { diskFolder: 'ARCHIVIO - N°10—The Design Issue', dbFolder: 'ARCHIVIO - N10-The Design Issue' },
  { diskFolder: "CDEC Foundation  - ...but then, what's in a name?", dbFolder: "CDEC Foundation - ...but then, what's in a name" },
  { diskFolder: "Knight Foundation  - Disinformation, 'Fake News,' and Influence Campaigns on Twitter", dbFolder: "Knight Foundation - Disinformation, 'Fake News,' and Influence Campaigns on Twitter" },
  { diskFolder: 'Laguna~B - 30th Anniversary Installation', dbFolder: 'Laguna-B - 30th Anniversary Installation' },
  { diskFolder: 'Laguna~B - Website Redesign', dbFolder: 'Laguna-B - Website Redesign' },
  { diskFolder: 'Museo Egizio - Annual Report 2020–2024', dbFolder: 'Museo Egizio - Annual Report 2020-2024' },
  { diskFolder: 'Triennale Milano - Insight—Heritage Accessible for All', dbFolder: 'Triennale Milano - Insight-Heritage Accessible for All' },
  { diskFolder: 'Banca Sella - Cosa cambia?', dbFolder: 'Banca Sella - Cosa cambia' },
]

async function main() {
  console.log('=== Fix Media Filenames ===\n')

  for (const { diskFolder, dbFolder } of AFFECTED_PROJECTS) {
    const localFolder = path.join(IMAGES_DIR, diskFolder)
    if (!fs.existsSync(localFolder)) {
      console.log(`  SKIP: No local folder "${diskFolder}"`)
      continue
    }

    console.log(`Processing: ${diskFolder}`)

    const files = fs.readdirSync(localFolder).filter(f => {
      const ext = path.extname(f).toLowerCase()
      return IMAGE_EXTS.has(ext) || VIDEO_EXTS.has(ext)
    })

    const fileRenameMap: Record<string, string> = {}
    let uploaded = 0
    let errors = 0

    for (const file of files) {
      const sanitizedFile = sanitize(file)
      fileRenameMap[file] = sanitizedFile
      const localPath = path.join(localFolder, file)
      const storagePath = `${dbFolder}/${sanitizedFile}`

      const ok = await uploadFile('project-media', storagePath, localPath)
      if (ok) uploaded++
      else errors++
    }

    console.log(`  Uploaded ${uploaded}/${files.length} files${errors ? `, ${errors} errors` : ''}`)

    // Update media references in DB
    // Find the project by folder_name
    const { data: project } = await supabase
      .from('projects')
      .select('id, media_order, hero_image, thumb_image')
      .eq('folder_name', dbFolder)
      .single()

    if (project) {
      const updates: Record<string, unknown> = {}

      if (project.media_order) {
        updates.media_order = (project.media_order as string[]).map(
          f => fileRenameMap[f] || sanitize(f)
        )
      }
      if (project.hero_image) {
        updates.hero_image = fileRenameMap[project.hero_image] || sanitize(project.hero_image)
      }
      if (project.thumb_image) {
        updates.thumb_image = fileRenameMap[project.thumb_image] || sanitize(project.thumb_image)
      }

      if (Object.keys(updates).length > 0) {
        const { error } = await supabase.from('projects').update(updates).eq('id', project.id)
        if (error) console.error(`  DB update error: ${error.message}`)
        else console.log(`  Updated DB references`)
      }
    }
  }

  console.log('\n=== Done ===')
}

main().catch(console.error)
