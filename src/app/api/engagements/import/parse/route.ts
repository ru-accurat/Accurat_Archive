import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { rowToClient } from '@/lib/db-utils'
import { matchClients } from '@/lib/client-matching'
import type { ClientRow } from '@/lib/db-utils'
import * as XLSX from 'xlsx'

export async function POST(request: Request) {
  const supabase = createServiceClient()

  const formData = await request.formData()
  const file = formData.get('file') as File
  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  // Parse file
  const buffer = Buffer.from(await file.arrayBuffer())
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })

  // Extract engagement rows, skipping year-separator and empty rows
  const rows: { year: number; projectName: string; clientName: string; amountEur: number | null; amountUsd: number | null }[] = []
  let currentYear: number | null = null

  for (const raw of rawRows) {
    const values = Object.values(raw)

    // Detect year header rows: a row where the first non-empty cell is a 4-digit number
    const firstVal = values.find(v => v !== '' && v != null)
    if (typeof firstVal === 'number' && firstVal >= 2000 && firstVal <= 2100) {
      // Check if this looks like a year separator (other cells mostly empty)
      const nonEmptyCount = values.filter(v => v !== '' && v != null).length
      if (nonEmptyCount <= 2) {
        currentYear = firstVal
        continue
      }
    }

    // Try to extract columns by position or common header names
    const keys = Object.keys(raw)

    // Try to find year, project name, client, EUR, USD from the row
    let year = currentYear
    let projectName = ''
    let clientName = ''
    let amountEur: number | null = null
    let amountUsd: number | null = null

    // Match by header name patterns
    for (const key of keys) {
      const val = raw[key]
      const lk = key.toLowerCase()

      if (lk.includes('year') || lk.includes('anno')) {
        const n = Number(val)
        if (n >= 2000 && n <= 2100) year = n
      } else if (lk.includes('project') || lk.includes('progetto') || lk.includes('nome')) {
        if (typeof val === 'string' && val.trim()) projectName = val.trim()
      } else if (lk.includes('client') || lk.includes('cliente')) {
        if (typeof val === 'string' && val.trim()) clientName = val.trim()
      } else if (lk.includes('eur') || lk.includes('€')) {
        const n = Number(val)
        if (!isNaN(n) && val !== '') amountEur = n
      } else if (lk.includes('usd') || lk.includes('$')) {
        const n = Number(val)
        if (!isNaN(n) && val !== '') amountUsd = n
      }
    }

    // Fallback: try positional mapping if headers didn't match
    if (!projectName && !clientName && keys.length >= 3) {
      const v0 = raw[keys[0]]
      const v1 = raw[keys[1]]
      const v2 = raw[keys[2]]
      const v3 = keys[3] ? raw[keys[3]] : null
      const v4 = keys[4] ? raw[keys[4]] : null

      // Pattern: Project Name | Client | EUR | USD (with year from separator)
      if (typeof v0 === 'string' && v0.trim()) projectName = v0.trim()
      if (typeof v1 === 'string' && v1.trim()) clientName = v1.trim()
      if (v2 !== '' && !isNaN(Number(v2))) amountEur = Number(v2)
      if (v3 !== '' && v3 != null && !isNaN(Number(v3))) amountUsd = Number(v3)
      // If there's a 5th column and no year yet, check if v4 could be something else
      if (!year && v4 !== '' && v4 != null) {
        const n = Number(v4)
        if (n >= 2000 && n <= 2100) year = n
      }
    }

    // Skip rows without essential data
    if (!projectName && !clientName) continue
    if (!year) continue

    rows.push({
      year,
      projectName: projectName || '(unnamed)',
      clientName: clientName || '(unknown)',
      amountEur,
      amountUsd,
    })
  }

  // Get all existing clients for matching
  const { data: clientsData } = await supabase.from('clients').select('*')
  const clients = (clientsData as ClientRow[] || []).map(rowToClient)

  // Extract unique client names from import
  const uniqueClientNames = [...new Set(rows.map(r => r.clientName))]

  // Run fuzzy matching
  const clientMatches = matchClients(uniqueClientNames, clients)

  // Auto-link suggestions: for each row, find projects with matching client + year overlap
  const { data: projectsData } = await supabase
    .from('projects')
    .select('id, client, start_year, end_year')

  const autoLinks: { rowIndex: number; suggestedProjectIds: string[] }[] = []
  if (projectsData) {
    rows.forEach((row, idx) => {
      const match = clientMatches.find(m => m.original === row.clientName)
      if (!match?.matchedClient) return

      const matchedClientName = match.matchedClient.name
      const suggested = projectsData
        .filter(p => {
          if (p.client !== matchedClientName) return false
          const pStart = p.start_year || 0
          const pEnd = p.end_year || pStart
          return row.year >= pStart && row.year <= pEnd
        })
        .map(p => p.id)

      if (suggested.length > 0) {
        autoLinks.push({ rowIndex: idx, suggestedProjectIds: suggested })
      }
    })
  }

  return NextResponse.json({
    rows,
    clientMatches,
    autoLinks,
    totalParsed: rawRows.length,
    validRows: rows.length,
  })
}
