/**
 * Upload media for CDEC and Knight Foundation projects
 * whose folder names contain smart quotes on disk.
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
    .replace(/\u00b0/g, '')
    .replace(/[\u2014\u2013]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\u2026/g, '...')
    .replace(/~/g, '-')
    .replace(/[?]/g, '')
    .replace(/[()]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

async function uploadFile(bucket: string, storagePath: string, localPath: string): Promise<boolean> {
  const buf = fs.readFileSync(localPath)
  const ext = path.extname(localPath).toLowerCase()
  let ct = 'application/octet-stream'
  if (IMAGE_EXTS.has(ext)) ct = `image/${ext === '.jpg' ? 'jpeg' : ext.slice(1)}`
  else if (VIDEO_EXTS.has(ext)) ct = `video/${ext.slice(1)}`

  const { error } = await supabase.storage.from(bucket).upload(storagePath, buf, {
    contentType: ct,
    upsert: true
  })
  if (error && !error.message.includes('already exists')) {
    console.error(`  ERR: ${storagePath}: ${error.message}`)
    return false
  }
  return true
}

async function main() {
  console.log('=== Fix Remaining Media ===\n')

  const allFolders = fs.readdirSync(IMAGES_DIR)
  const cdecDisk = allFolders.find(f => f.startsWith('CDEC'))
  const knightDisk = allFolders.find(f => f.startsWith('Knight Foundation'))

  const targets = [
    { disk: cdecDisk, dbFolder: "CDEC Foundation - ...but then, what's in a name" },
    { disk: knightDisk, dbFolder: "Knight Foundation - Disinformation, 'Fake News,' and Influence Campaigns on Twitter" },
  ]

  for (const { disk, dbFolder } of targets) {
    if (!disk) { console.log(`SKIP: folder not found for ${dbFolder}`); continue }

    console.log(`Processing: ${disk}`)
    const localFolder = path.join(IMAGES_DIR, disk)
    const files = fs.readdirSync(localFolder).filter(f => {
      const ext = path.extname(f).toLowerCase()
      return IMAGE_EXTS.has(ext) || VIDEO_EXTS.has(ext)
    })

    let ok = 0, errors = 0
    for (const file of files) {
      const sanitizedFile = sanitize(file)
      const storagePath = `${dbFolder}/${sanitizedFile}`
      const result = await uploadFile('project-media', storagePath, path.join(localFolder, file))
      if (result) ok++
      else errors++
    }
    console.log(`  Uploaded ${ok}/${files.length}${errors ? ` (${errors} errors)` : ''}`)
  }

  console.log('\n=== Done ===')
}

main().catch(console.error)
