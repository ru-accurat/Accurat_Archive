import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

interface ClientMapping {
  original: string
  clientId: string | null
  newClientName?: string
}

interface ProjectLink {
  rowIndex: number
  projectIds: string[]
}

export async function POST(request: Request) {
  const supabase = createServiceClient()
  const { rows, clientMappings, projectLinks, filename } = await request.json() as {
    rows: { year: number; projectName: string; clientName: string; amountEur: number | null; amountUsd: number | null }[]
    clientMappings: ClientMapping[]
    projectLinks?: ProjectLink[]
    filename: string
  }

  // Create import batch
  const { data: batch, error: batchError } = await supabase
    .from('import_batches')
    .insert({ filename, row_count: rows.length })
    .select()
    .single()

  if (batchError || !batch) {
    return NextResponse.json({ error: 'Failed to create import batch' }, { status: 500 })
  }

  // Build client name → client ID map
  const clientMap = new Map<string, string>()
  let clientsCreated = 0

  for (const mapping of clientMappings) {
    if (mapping.clientId) {
      clientMap.set(mapping.original, mapping.clientId)
      // Add alias if the original name differs from the canonical
      const { data: client } = await supabase.from('clients').select('name, aliases').eq('id', mapping.clientId).single()
      if (client && client.name !== mapping.original && !client.aliases.includes(mapping.original)) {
        await supabase.from('clients').update({
          aliases: [...client.aliases, mapping.original]
        }).eq('id', mapping.clientId)
      }
    } else {
      // Create new client
      const name = mapping.newClientName || mapping.original
      const { data: newClient } = await supabase
        .from('clients')
        .insert({
          name,
          aliases: name !== mapping.original ? [mapping.original] : [],
        })
        .select()
        .single()
      if (newClient) {
        clientMap.set(mapping.original, newClient.id)
        clientsCreated++
      }
    }
  }

  // Insert engagements with deduplication
  let inserted = 0
  let skipped = 0
  const insertedEngagementIds: { rowIndex: number; engagementId: string }[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const clientId = clientMap.get(row.clientName)
    if (!clientId) { skipped++; continue }

    // Check for duplicate
    const { data: existing } = await supabase
      .from('engagements')
      .select('id')
      .eq('year', row.year)
      .eq('project_name', row.projectName)
      .eq('client_id', clientId)
      .limit(1)

    if (existing && existing.length > 0) {
      skipped++
      continue
    }

    const { data: eng } = await supabase
      .from('engagements')
      .insert({
        year: row.year,
        project_name: row.projectName,
        client_id: clientId,
        original_client_name: row.clientName,
        amount_eur: row.amountEur,
        amount_usd: row.amountUsd,
        import_batch_id: batch.id,
      })
      .select('id')
      .single()

    if (eng) {
      inserted++
      insertedEngagementIds.push({ rowIndex: i, engagementId: eng.id })
    }
  }

  // Insert project links
  let linksCreated = 0
  if (projectLinks) {
    for (const link of projectLinks) {
      const match = insertedEngagementIds.find(e => e.rowIndex === link.rowIndex)
      if (!match) continue

      for (const projectId of link.projectIds) {
        const { error } = await supabase.from('engagement_projects').insert({
          engagement_id: match.engagementId,
          project_id: projectId,
        })
        if (!error) linksCreated++
      }
    }
  }

  // Update batch row count with actual inserted count
  await supabase.from('import_batches').update({ row_count: inserted }).eq('id', batch.id)

  return NextResponse.json({
    inserted,
    skipped,
    clientsCreated,
    linksCreated,
    batchId: batch.id,
  })
}
