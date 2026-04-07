import { NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { createServiceClient } from '@/lib/supabase'

// POST /api/public/collection/[token]/track-view
// Body: { projectId?: string, durationMs?: number }
// Anonymous visitor_id is derived from a hash of (collection_id + UA + IP) for
// rough unique counts without cookies.
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = createServiceClient()

  const { data: collection } = await supabase
    .from('collections')
    .select('id')
    .eq('share_token', token)
    .single()

  if (!collection) {
    return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
  }

  let body: { projectId?: string; durationMs?: number } = {}
  try {
    body = await req.json()
  } catch {
    // empty body is fine
  }

  const ua = req.headers.get('user-agent') || ''
  const fwd = req.headers.get('x-forwarded-for') || ''
  const ip = fwd.split(',')[0]?.trim() || req.headers.get('x-real-ip') || ''

  const visitorId = createHash('sha256')
    .update(`${collection.id}|${ua}|${ip}`)
    .digest('hex')
    .slice(0, 32)

  const { error } = await supabase.from('collection_views').insert({
    collection_id: collection.id,
    project_id: body.projectId || null,
    visitor_id: visitorId,
    duration_ms: typeof body.durationMs === 'number' ? body.durationMs : null,
    user_agent: ua.slice(0, 500) || null,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
