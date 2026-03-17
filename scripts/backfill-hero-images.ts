/**
 * One-time script: populates hero_image for all projects
 * by listing their storage files and finding the first image.
 *
 * Usage: npx tsx scripts/backfill-hero-images.ts
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

const IMAGE_EXTS = ['.png', '.jpg', '.jpeg', '.webp', '.gif']

async function main() {
  console.log('=== Backfill Hero Images ===\n')

  const { data: projects, error } = await supabase
    .from('projects')
    .select('id, folder_name, hero_image, thumb_image, media_order')

  if (error || !projects) {
    console.error('Failed to fetch projects:', error?.message)
    return
  }

  console.log(`Processing ${projects.length} projects...\n`)

  let updated = 0
  const batchSize = 20

  for (let i = 0; i < projects.length; i += batchSize) {
    const batch = projects.slice(i, i + batchSize)
    await Promise.all(batch.map(async (p) => {
      // Skip if already has hero_image set
      if (p.hero_image) return

      const { data: files } = await supabase.storage
        .from('project-media')
        .list(p.folder_name, { limit: 50, sortBy: { column: 'name', order: 'asc' } })

      if (!files || files.length === 0) return

      const imageFiles = files.filter(f => {
        const ext = '.' + f.name.split('.').pop()?.toLowerCase()
        return IMAGE_EXTS.includes(ext)
      })

      if (imageFiles.length === 0) return

      // Find header/thumb/first
      const headerFile = imageFiles.find(f => f.name.toLowerCase().startsWith('_header'))
      const thumbFile = imageFiles.find(f => f.name.toLowerCase().startsWith('_thumb'))
      const firstImage = imageFiles[0]

      const updates: Record<string, unknown> = {}

      // Set hero_image to header file or first image
      updates.hero_image = headerFile?.name || firstImage?.name || null
      if (thumbFile) updates.thumb_image = thumbFile.name

      // Set media_order to all files in order
      updates.media_order = files.map(f => f.name)

      const { error: updateErr } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', p.id)

      if (updateErr) {
        console.error(`  Error updating ${p.id}: ${updateErr.message}`)
      } else {
        updated++
      }
    }))
    process.stdout.write(`\r  Processed ${Math.min(i + batchSize, projects.length)}/${projects.length}`)
  }

  console.log(`\n\nUpdated ${updated} projects with hero images`)
  console.log('=== Done ===')
}

main().catch(console.error)
