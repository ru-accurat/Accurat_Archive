/**
 * scripts/rename-all-media.ts
 *
 * Iterates every project and normalizes media filenames in the
 * `project-media` bucket to the convention {folder}_{NN}.{ext}
 * (or {folder}_inuse_{NN}.{ext} for in-use generated images).
 *
 * Updates DB references (hero_image, thumb_image, media_order)
 * to reflect any renames.
 *
 * Run: npm run media:normalize
 */
import { createClient } from '@supabase/supabase-js'
import { normalizeFolderFiles } from '../src/lib/media-naming'

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false },
  })

  const { data: projects, error } = await supabase
    .from('projects')
    .select('id, folder_name, hero_image, thumb_image, media_order')
    .order('folder_name', { ascending: true })

  if (error || !projects) {
    console.error('Failed to load projects:', error?.message)
    process.exit(1)
  }

  let totalRenamed = 0
  let projectsTouched = 0

  for (const p of projects as Array<{
    id: string
    folder_name: string
    hero_image: string | null
    thumb_image: string | null
    media_order: string[] | null
  }>) {
    if (!p.folder_name) continue

    const renames = await normalizeFolderFiles(supabase, p.folder_name)
    const renameCount = Object.keys(renames).length
    if (renameCount === 0) {
      console.log(`OK   ${p.folder_name}`)
      continue
    }

    projectsTouched++
    totalRenamed += renameCount

    const remap = (n: string | null | undefined) => (n ? renames[n] ?? n : n)

    const updates: Record<string, unknown> = {}
    if (Array.isArray(p.media_order)) {
      updates.media_order = p.media_order.map(n => renames[n] ?? n)
    }
    const newHero = remap(p.hero_image)
    if (newHero && newHero !== p.hero_image) updates.hero_image = newHero
    const newThumb = remap(p.thumb_image)
    if (newThumb && newThumb !== p.thumb_image) updates.thumb_image = newThumb

    if (Object.keys(updates).length > 0) {
      const { error: upErr } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', p.id)
      if (upErr) {
        console.error(`  ! DB update failed for ${p.folder_name}: ${upErr.message}`)
      }
    }

    console.log(`REN  ${p.folder_name}  (${renameCount} files)`)
    for (const [oldName, newName] of Object.entries(renames)) {
      console.log(`       ${oldName}  ->  ${newName}`)
    }
  }

  console.log('')
  console.log(`Done. Renamed ${totalRenamed} files across ${projectsTouched} projects.`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
