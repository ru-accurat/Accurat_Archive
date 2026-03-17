/**
 * One-time migration script: imports projects.json and media files into Supabase.
 *
 * Usage:
 *   npx tsx scripts/migrate-data.ts
 *
 * Requires .env.local to be loaded (or env vars set).
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
    if (match) {
      process.env[match[1].trim()] = match[2].trim()
    }
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// Paths to the existing data
const DATA_DIR = path.resolve(__dirname, '../../accurat-archive/data')
const IMAGES_DIR = path.resolve(__dirname, '../../Images')
const PROJECTS_JSON = path.join(DATA_DIR, 'projects.json')
const HISTORY_DIR = path.join(DATA_DIR, 'history')
const LOGOS_DIR = path.join(DATA_DIR, 'logos')

interface Project {
  id: string
  fullName: string
  client: string
  projectName: string
  tier: number
  section: string
  start: number | null
  end: number | null
  domains: string[]
  services: string[]
  tagline: string
  description: string
  challenge: string
  solution: string
  deliverables: string
  clientQuotes: string
  team: string[]
  urls: string[]
  output: string
  mediaOrder?: string[]
  heroImage?: string
  thumbImage?: string
  sectionImages?: string[]
  aiGenerated?: string[]
  folderName: string
  clientLogo?: string
}

function projectToRow(p: Project) {
  return {
    id: p.id,
    full_name: p.fullName,
    client: p.client,
    project_name: p.projectName,
    tier: p.tier,
    section: p.section || '',
    start_year: p.start,
    end_year: p.end,
    domains: p.domains || [],
    services: p.services || [],
    tagline: p.tagline || '',
    description: p.description || '',
    challenge: p.challenge || '',
    solution: p.solution || '',
    deliverables: p.deliverables || '',
    client_quotes: p.clientQuotes || '',
    team: p.team || [],
    urls: p.urls || [],
    output: p.output || '',
    folder_name: p.folderName,
    media_order: p.mediaOrder || null,
    hero_image: p.heroImage || null,
    thumb_image: p.thumbImage || null,
    ai_generated: p.aiGenerated || [],
    client_logo: p.clientLogo || null,
  }
}

const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif'])
const VIDEO_EXTS = new Set(['.mp4', '.mov', '.avi', '.webm'])

async function migrateProjects() {
  console.log('--- Migrating Projects ---')

  if (!fs.existsSync(PROJECTS_JSON)) {
    // Try Application Support path
    const appSupportPath = path.join(
      process.env.HOME || '',
      'Library/Application Support/Accurat Archive/projects.json'
    )
    if (fs.existsSync(appSupportPath)) {
      console.log(`Using projects.json from Application Support`)
      const projects: Project[] = JSON.parse(fs.readFileSync(appSupportPath, 'utf8'))
      return migrateProjectsData(projects)
    }
    console.error(`projects.json not found at ${PROJECTS_JSON}`)
    return []
  }

  const projects: Project[] = JSON.parse(fs.readFileSync(PROJECTS_JSON, 'utf8'))
  return migrateProjectsData(projects)
}

async function migrateProjectsData(projects: Project[]) {
  console.log(`Found ${projects.length} projects`)

  // Insert in batches of 50
  const batchSize = 50
  for (let i = 0; i < projects.length; i += batchSize) {
    const batch = projects.slice(i, i + batchSize).map(projectToRow)
    const { error } = await supabase.from('projects').upsert(batch, { onConflict: 'id' })
    if (error) {
      console.error(`Error inserting batch ${i}:`, error.message)
    } else {
      console.log(`  Inserted projects ${i + 1}-${Math.min(i + batchSize, projects.length)}`)
    }
  }

  return projects
}

async function migrateHistory() {
  console.log('\n--- Migrating History ---')

  const historyBase = fs.existsSync(HISTORY_DIR) ? HISTORY_DIR :
    path.join(process.env.HOME || '', 'Library/Application Support/Accurat Archive/history')

  if (!fs.existsSync(historyBase)) {
    console.log('No history directory found, skipping')
    return
  }

  const projectDirs = fs.readdirSync(historyBase).filter(d =>
    fs.statSync(path.join(historyBase, d)).isDirectory()
  )
  console.log(`Found history for ${projectDirs.length} projects`)

  let total = 0
  for (const projectId of projectDirs) {
    const dir = path.join(historyBase, projectId)
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'))

    for (const file of files) {
      const snapshot = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'))
      const timestamp = file.replace('.json', '').replace(/-/g, (m, i) => {
        // Convert back from safe filename to ISO
        // Format: YYYY-MM-DDTHH-MM-SS-mmmZ → YYYY-MM-DDTHH:MM:SS.mmmZ
        return i > 9 ? ':' : m
      })

      const { error } = await supabase.from('project_history').insert({
        project_id: projectId,
        snapshot: snapshot,
        created_at: new Date().toISOString()
      })
      if (error && !error.message.includes('duplicate')) {
        console.error(`  Error inserting history for ${projectId}:`, error.message)
      }
      total++
    }
  }
  console.log(`  Inserted ${total} history snapshots`)
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

async function migrateMedia(projects: Project[]) {
  console.log('\n--- Migrating Media ---')

  const imagesBase = fs.existsSync(IMAGES_DIR) ? IMAGES_DIR :
    path.join(process.env.HOME || '', 'Library/Application Support/Accurat Archive/Images')

  if (!fs.existsSync(imagesBase)) {
    console.log(`Images directory not found at ${imagesBase}, skipping`)
    return
  }

  let uploaded = 0
  let skipped = 0
  let errors = 0
  const concurrency = 5

  for (const project of projects) {
    const folderPath = path.join(imagesBase, project.folderName)
    if (!fs.existsSync(folderPath)) {
      continue
    }

    const files = fs.readdirSync(folderPath).filter(f => {
      const ext = path.extname(f).toLowerCase()
      return IMAGE_EXTS.has(ext) || VIDEO_EXTS.has(ext)
    })

    // Upload in parallel batches
    for (let i = 0; i < files.length; i += concurrency) {
      const batch = files.slice(i, i + concurrency)
      const results = await Promise.all(
        batch.map(file => {
          const localPath = path.join(folderPath, file)
          const storagePath = `${project.folderName}/${file}`
          return uploadFile('project-media', storagePath, localPath)
        })
      )
      for (const ok of results) {
        if (ok) uploaded++
        else errors++
      }
    }

    process.stdout.write(`\r  ${project.folderName}: ${files.length} files`)
  }

  console.log(`\n  Uploaded: ${uploaded}, Skipped: ${skipped}, Errors: ${errors}`)
}

async function migrateLogos() {
  console.log('\n--- Migrating Logos ---')

  const logosBase = fs.existsSync(LOGOS_DIR) ? LOGOS_DIR :
    path.join(process.env.HOME || '', 'Library/Application Support/Accurat Archive/logos')

  if (!fs.existsSync(logosBase)) {
    console.log('No logos directory found, skipping')
    return
  }

  const files = fs.readdirSync(logosBase).filter(f => {
    const ext = path.extname(f).toLowerCase()
    return IMAGE_EXTS.has(ext)
  })

  console.log(`Found ${files.length} logo files`)

  for (const file of files) {
    await uploadFile('logos', file, path.join(logosBase, file))
  }
  console.log(`  Done`)
}

async function main() {
  console.log('=== Accurat Archive Migration ===\n')
  console.log(`Supabase URL: ${SUPABASE_URL}`)
  console.log(`Data dir: ${DATA_DIR}`)
  console.log(`Images dir: ${IMAGES_DIR}\n`)

  const projects = await migrateProjects()
  await migrateHistory()
  await migrateMedia(projects)
  await migrateLogos()

  console.log('\n=== Migration Complete ===')
}

main().catch(console.error)
