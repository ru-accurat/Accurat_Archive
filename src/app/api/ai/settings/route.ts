import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

// GET /api/ai/settings — get all AI settings
export async function GET() {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('ai_settings')
    .select('key, value, updated_at')
    .order('key')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Convert to a keyed object
  const settings: Record<string, { value: string; updatedAt: string }> = {}
  for (const row of data || []) {
    settings[row.key] = { value: row.value, updatedAt: row.updated_at }
  }

  return NextResponse.json(settings)
}

// PATCH /api/ai/settings — update one or more settings
export async function PATCH(request: Request) {
  const supabase = createServiceClient()
  const updates: Record<string, string> = await request.json()

  const errors: string[] = []
  for (const [key, value] of Object.entries(updates)) {
    const { error } = await supabase
      .from('ai_settings')
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
    if (error) errors.push(`${key}: ${error.message}`)
  }

  if (errors.length > 0) {
    return NextResponse.json({ error: errors.join('; ') }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
