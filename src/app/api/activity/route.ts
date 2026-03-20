import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

// GET /api/activity?limit=50&offset=0
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
  const offset = parseInt(searchParams.get('offset') || '0')

  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('activity_log')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
