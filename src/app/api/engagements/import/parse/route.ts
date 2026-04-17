import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { rowToClient } from '@/lib/db-utils'
import { matchClients } from '@/lib/client-matching'
import type { ClientRow } from '@/lib/db-utils'
import * as XLSX from 'xlsx'
import { requireBusinessAccess } from '@/lib/api-auth'

export async function POST(request: Request) {
  const deny = await requireBusinessAccess()
  if (deny) return deny
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

  // Detect column names — support both Italian and English
  const firstRow = rawRows[0] || {}
  const keys = Object.keys(firstRow)

  // Map columns by matching patterns
  let yearCol = '', nameCol = '', clientCol = '', eurCol = '', usdCol = ''
  for (const key of keys) {
    const lk = key.toLowerCase()
    if (lk.includes('anno') || lk.includes('year')) yearCol = key
    else if (lk.includes('progetto') || lk.includes('project') || lk.includes('nome')) nameCol = key
    else if (lk.includes('cliente') || lk.includes('client')) clientCol = key
    else if (lk.includes('euro') || lk.includes('eur') || lk.includes('€')) eurCol = key
    else if (lk.includes('dollar') || lk.includes('usd') || lk.includes('$')) usdCol = key
  }

  // Fallback to positional if headers didn't match
  if (!yearCol && keys.length >= 3) {
    yearCol = keys[0]
    nameCol = keys[1]
    clientCol = keys[2]
    eurCol = keys[3] || ''
    usdCol = keys[4] || ''
  }

  // Extract engagement rows
  const rows: { year: number; projectName: string; clientName: string; amountEur: number | null; amountUsd: number | null }[] = []

  for (const raw of rawRows) {
    const yearVal = raw[yearCol]
    const nameVal = raw[nameCol]
    const clientVal = raw[clientCol]
    const eurVal = raw[eurCol]
    const usdVal = raw[usdCol]

    // Parse year
    const year = typeof yearVal === 'number' ? yearVal : parseInt(String(yearVal))
    if (isNaN(year) || year < 2000 || year > 2100) continue

    // Parse name and client
    const projectName = String(nameVal || '').trim()
    const clientName = String(clientVal || '').trim()

    // Skip separator rows (year only, no project name or client)
    if (!projectName && !clientName) continue

    // Parse amounts
    let amountEur: number | null = null
    let amountUsd: number | null = null

    if (eurVal !== '' && eurVal != null) {
      const n = typeof eurVal === 'number' ? eurVal : parseFloat(String(eurVal).replace(/[,\s]/g, ''))
      if (!isNaN(n)) amountEur = Math.round(n * 100) / 100
    }
    if (usdVal !== '' && usdVal != null) {
      const n = typeof usdVal === 'number' ? usdVal : parseFloat(String(usdVal).replace(/[,\s]/g, ''))
      if (!isNaN(n)) amountUsd = Math.round(n * 100) / 100
    }

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
