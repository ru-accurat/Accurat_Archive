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
  return new RegExp(`^${escapeRegex(folder)}_(inuse_)?(\\d{2,})\\.([a-z0-9]+)$`)
}

export function isConventional(folder: string, filename: string): boolean {
  return buildPattern(folder).test(filename)
}

/** Returns true if the filename is an in-use generated image. */
export function isInUseImage(filename: string): boolean {
  return /_inuse[_.]/i.test(filename)
}

function parseSeq(folder: string, filename: string): { inuse: boolean; seq: number; ext: string } | null {
  const m = filename.match(buildPattern(folder))
  if (!m) return null
  return { inuse: !!m[1], seq: parseInt(m[2], 10), ext: m[3] }
}

function hasInusePrefix(filename: string): boolean {
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

export async function normalizeFolderFiles(
  supabase: SupabaseClient,
  folder: string
): Promise<Record<string, string>> {
  const renames: Record<string, string> = {}

  const { data: files, error } = await supabase.storage
    .from(BUCKET)
    .list(folder, { sortBy: { column: 'name', order: 'asc' }, limit: 1000 })

  if (error || !files) return renames

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
