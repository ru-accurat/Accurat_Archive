import type { SupabaseClient } from '@supabase/supabase-js'

// Naming convention:
//   {folderName}_{NN}.{ext}             — regular media
//   {folderName}_inuse_{NN}.{ext}       — in-use generated images
// NN is a 2-digit zero-padded sequence (01, 02, ...). ext is lowercase.

const BUCKET = 'project-media'

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function buildPattern(folder: string): RegExp {
  // Captures: 1=optional "inuse" prefix marker, 2=NN, 3=ext
  return new RegExp(
    `^${escapeRegex(folder)}_(inuse_)?(\\d{2,})\\.([a-z0-9]+)$`
  )
}

export function isConventional(folder: string, filename: string): boolean {
  return buildPattern(folder).test(filename)
}

function parseSeq(folder: string, filename: string): { inuse: boolean; seq: number; ext: string } | null {
  const m = filename.match(buildPattern(folder))
  if (!m) return null
  return { inuse: !!m[1], seq: parseInt(m[2], 10), ext: m[3] }
}

function hasInusePrefix(filename: string): boolean {
  // Detect the legacy/general "inuse" marker anywhere recognizable in original name.
  return /(^|[_\-\s])inuse([_\-\s.]|$)/i.test(filename)
}

export function nextConventionalName(
  folder: string,
  ext: string,
  existing: string[],
  prefix?: 'inuse'
): string {
  const cleanExt = ext.replace(/^\./, '').toLowerCase()
  const usedSeqs = new Set<number>()
  for (const name of existing) {
    const parsed = parseSeq(folder, name)
    if (!parsed) continue
    if (prefix === 'inuse' && !parsed.inuse) continue
    if (!prefix && parsed.inuse) continue
    usedSeqs.add(parsed.seq)
  }
  let seq = 1
  while (usedSeqs.has(seq)) seq++
  const nn = String(seq).padStart(2, '0')
  const mid = prefix === 'inuse' ? 'inuse_' : ''
  return `${folder}_${mid}${nn}.${cleanExt}`
}

/**
 * Lists all files in a project folder and renames non-conforming ones to the
 * convention. Performs storage moves in place. Returns a map of old→new names
 * (basename only, not full storage path) so callers can update DB references.
 *
 * Files already matching the convention are NOT renamed.
 * Files whose original name carries an "inuse" marker get the inuse prefix.
 */
export async function normalizeFolderFiles(
  supabase: SupabaseClient,
  folder: string
): Promise<Record<string, string>> {
  const renames: Record<string, string> = {}

  const { data: files, error } = await supabase.storage
    .from(BUCKET)
    .list(folder, { sortBy: { column: 'name', order: 'asc' }, limit: 1000 })

  if (error || !files) return renames

  // Existing conventional names (used to seed sequence allocation).
  const existingNames: string[] = files
    .map(f => f.name)
    .filter(n => isConventional(folder, n))

  for (const file of files) {
    const name = file.name
    if (isConventional(folder, name)) continue

    const extMatch = name.match(/\.([^.]+)$/)
    if (!extMatch) continue
    const ext = extMatch[1].toLowerCase()

    const prefix: 'inuse' | undefined = hasInusePrefix(name) ? 'inuse' : undefined
    const newName = nextConventionalName(folder, ext, existingNames, prefix)

    const { error: moveError } = await supabase.storage
      .from(BUCKET)
      .move(`${folder}/${name}`, `${folder}/${newName}`)

    if (moveError) {
      console.error(`Failed to rename ${folder}/${name} -> ${newName}:`, moveError.message)
      continue
    }

    renames[name] = newName
    existingNames.push(newName)
  }

  return renames
}
