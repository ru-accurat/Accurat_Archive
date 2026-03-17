import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

// GET /api/config
export async function GET() {
  const supabase = createServiceClient()
  const { data, error } = await supabase.from('config').select('*')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const config: Record<string, unknown> = {}
  for (const row of data || []) {
    config[row.key] = row.value
  }

  return NextResponse.json(config)
}

// PATCH /api/config
export async function PATCH(request: Request) {
  const supabase = createServiceClient()
  const body = await request.json()

  for (const [key, value] of Object.entries(body)) {
    const { error } = await supabase
      .from('config')
      .upsert({ key, value }, { onConflict: 'key' })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  // Return updated config
  const { data } = await supabase.from('config').select('*')
  const config: Record<string, unknown> = {}
  for (const row of data || []) {
    config[row.key] = row.value
  }

  return NextResponse.json(config)
}
