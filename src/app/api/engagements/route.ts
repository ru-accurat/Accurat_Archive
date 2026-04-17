import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { requireBusinessAccess } from '@/lib/api-auth'

export async function GET(request: Request) {
  const deny = await requireBusinessAccess()
  if (deny) return deny
  const supabase = createServiceClient()
  const { searchParams } = new URL(request.url)
  const year = searchParams.get('year')
  const clientId = searchParams.get('clientId')
  const linked = searchParams.get('linked')
  const limit = parseInt(searchParams.get('limit') || '500')
  const offset = parseInt(searchParams.get('offset') || '0')

  // Use a raw query to get engagement data with client name and linked project count
  let query = supabase
    .from('engagements')
    .select(`
      *,
      clients!inner(name)
    `)
    .order('year', { ascending: false })
    .order('amount_eur', { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1)

  if (year) query = query.eq('year', parseInt(year))
  if (clientId) query = query.eq('client_id', clientId)

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Get linked project counts
  const engagementIds = (data || []).map((e: Record<string, unknown>) => e.id)
  const { data: links } = await supabase
    .from('engagement_projects')
    .select('engagement_id')
    .in('engagement_id', engagementIds.length > 0 ? engagementIds : ['__none__'])

  const linkCounts = new Map<string, number>()
  for (const link of (links || []) as { engagement_id: string }[]) {
    linkCounts.set(link.engagement_id, (linkCounts.get(link.engagement_id) || 0) + 1)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const results = (data || []).map((row: any) => ({
    id: row.id,
    year: row.year,
    projectName: row.project_name,
    clientId: row.client_id,
    clientName: row.clients?.name || '',
    originalClientName: row.original_client_name,
    amountEur: row.amount_eur != null ? Number(row.amount_eur) : null,
    amountUsd: row.amount_usd != null ? Number(row.amount_usd) : null,
    importBatchId: row.import_batch_id,
    notes: row.notes || '',
    linkedProjectCount: linkCounts.get(row.id as string) || 0,
  }))

  const cacheHeaders = { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=600' }

  // Filter by linked/unlinked after getting counts
  if (linked === 'true') {
    return NextResponse.json(results.filter((r: { linkedProjectCount: number }) => r.linkedProjectCount > 0), { headers: cacheHeaders })
  } else if (linked === 'false') {
    return NextResponse.json(results.filter((r: { linkedProjectCount: number }) => r.linkedProjectCount === 0), { headers: cacheHeaders })
  }

  return NextResponse.json(results, { headers: cacheHeaders })
}
