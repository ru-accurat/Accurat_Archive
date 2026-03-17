/**
 * Import CSV and update existing projects in Supabase.
 * Matches by full_name (Client - Project Name).
 *
 * Usage: npx tsx scripts/import-csv-update.ts
 */
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import Papa from 'papaparse'

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

const CSV_PATH = path.resolve(__dirname, '../../accurat-archive-rewritten.csv')

function parseDomains(raw: string): string[] {
  if (!raw) return []
  return raw.split(',').map(d => d.trim().replace(/^#/, '')).filter(Boolean)
}

function parseList(raw: string): string[] {
  if (!raw) return []
  return raw.split(',').map(s => s.trim()).filter(Boolean)
}

function parseYear(raw: string): number | null {
  if (!raw) return null
  const n = parseInt(raw, 10)
  return isNaN(n) ? null : n
}

async function main() {
  console.log('=== CSV Import Update ===\n')

  const csvContent = fs.readFileSync(CSV_PATH, 'utf8')
  const parsed = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
  })
  const rows = parsed.data as Record<string, string>[]

  console.log(`Parsed ${rows.length} rows from CSV\n`)

  // Get existing projects from DB
  const { data: existing, error } = await supabase
    .from('projects')
    .select('id, full_name')

  if (error || !existing) {
    console.error('Failed to fetch projects:', error?.message)
    return
  }

  const idByFullName = new Map<string, string>()
  for (const p of existing) {
    idByFullName.set(p.full_name, p.id)
  }

  let updated = 0
  let notFound = 0
  let errors = 0

  for (const row of rows) {
    const fullName = row['Full Name']?.trim()
    if (!fullName) continue

    const id = idByFullName.get(fullName)
    if (!id) {
      console.log(`  NOT FOUND: "${fullName}"`)
      notFound++
      continue
    }

    // Collect URLs
    const urls: string[] = []
    if (row['URL 1']?.trim()) urls.push(row['URL 1'].trim())
    if (row['URL 2']?.trim()) urls.push(row['URL 2'].trim())
    if (row['URL 3']?.trim()) urls.push(row['URL 3'].trim())

    const updates: Record<string, unknown> = {
      client: row['Client']?.trim() || undefined,
      project_name: row['Project Name']?.trim() || undefined,
      tier: row['Tier'] ? parseInt(row['Tier'], 10) : undefined,
      section: row['Unit']?.trim() || '',
      start_year: parseYear(row['Start']),
      end_year: parseYear(row['End']),
      domains: parseDomains(row['Domains and Sectors']),
      services: parseList(row['Services']),
      tagline: row['Tagline']?.trim() || '',
      description: row['Description']?.trim() || '',
      challenge: row['Challenge']?.trim() || '',
      solution: row['Solution']?.trim() || '',
      deliverables: row['Deliverables']?.trim() || '',
      client_quotes: row['Client Quotes']?.trim() || '',
      team: parseList(row['Accurat Team']),
      urls,
      output: row['Output']?.trim() || '',
    }

    // Remove undefined values
    for (const key of Object.keys(updates)) {
      if (updates[key] === undefined) delete updates[key]
    }

    const { error: updateErr } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', id)

    if (updateErr) {
      console.error(`  ERROR updating "${fullName}": ${updateErr.message}`)
      errors++
    } else {
      updated++
    }
  }

  console.log(`\nUpdated: ${updated}`)
  console.log(`Not found: ${notFound}`)
  console.log(`Errors: ${errors}`)
  console.log('\n=== Done ===')
}

main().catch(console.error)
