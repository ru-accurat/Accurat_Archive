import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import Papa from 'papaparse'

const envPath = path.resolve(__dirname, '../.env.local')
const envContent = fs.readFileSync(envPath, 'utf8')
for (const line of envContent.split('\n')) {
  const match = line.match(/^([^#=]+)=(.*)$/)
  if (match) process.env[match[1].trim()] = match[2].trim()
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
)

async function main() {
  const csv = fs.readFileSync(path.resolve(__dirname, '../../accurat-archive-rewritten.csv'), 'utf8')
  const rows = Papa.parse(csv, { header: true, skipEmptyLines: true }).data as Record<string, string>[]
  const row = rows.find(r => (r['Full Name'] || '').includes('Corriere'))
  if (!row) { console.log('Row not found'); return }

  const urls: string[] = []
  if (row['URL 1']?.trim()) urls.push(row['URL 1'].trim())
  if (row['URL 2']?.trim()) urls.push(row['URL 2'].trim())
  if (row['URL 3']?.trim()) urls.push(row['URL 3'].trim())

  const updates = {
    tagline: row['Tagline']?.trim() || '',
    description: row['Description']?.trim() || '',
    challenge: row['Challenge']?.trim() || '',
    solution: row['Solution']?.trim() || '',
    deliverables: row['Deliverables']?.trim() || '',
    client_quotes: row['Client Quotes']?.trim() || '',
    team: (row['Accurat Team'] || '').split(',').map(s => s.trim()).filter(Boolean),
    urls,
    output: row['Output']?.trim() || '',
  }

  const { error } = await supabase.from('projects').update(updates).ilike('full_name', '%Corriere%')
  console.log(error ? 'Error: ' + error.message : 'Updated Corriere project')
}

main().catch(console.error)
