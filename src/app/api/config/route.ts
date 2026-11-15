import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { requireRole } from '@/lib/api-auth'

// Keys whose values are secrets: never sent back to the browser.
const SECRET_KEYS = new Set(['anthropicApiKey', 'googleApiKey'])
// Keys the Settings page may write.
const WRITABLE_KEYS = new Set([...SECRET_KEYS, 'inuseImageModel'])

export interface SecretStatus {
  set: boolean
  last4: string
}

type ConfigRow = { key: string; value: unknown }

/** Browser-safe shape of the config: secrets become { set, last4 }, never the value. */
function toResponse(rows: ConfigRow[]): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const row of rows) {
    if (SECRET_KEYS.has(row.key)) {
      const v = typeof row.value === 'string' ? row.value : ''
      out[row.key] = { set: v.length > 0, last4: v.length >= 8 ? v.slice(-4) : '' } satisfies SecretStatus
    } else {
      out[row.key] = row.value
    }
  }
  for (const key of SECRET_KEYS) {
    if (!(key in out)) out[key] = { set: false, last4: '' } satisfies SecretStatus
  }
  return out
}

// GET /api/config: admins only; secrets are masked
export async function GET() {
  const deny = await requireRole(['admin'])
  if (deny) return deny

  const supabase = createServiceClient()
  const { data, error } = await supabase.from('config').select('key, value')
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(toResponse((data || []) as ConfigRow[]))
}

// PATCH /api/config: admins only; known keys only; an empty secret never wipes a stored one
export async function PATCH(request: Request) {
  const deny = await requireRole(['admin'])
  if (deny) return deny

  const supabase = createServiceClient()
  const body = (await request.json()) as Record<string, unknown>

  for (const [key, value] of Object.entries(body)) {
    if (!WRITABLE_KEYS.has(key)) {
      return NextResponse.json({ error: `Unknown config key: ${key}` }, { status: 400 })
    }
    if (SECRET_KEYS.has(key) && (typeof value !== 'string' || value.trim() === '')) continue

    const { error } = await supabase
      .from('config')
      .upsert({ key, value: typeof value === 'string' ? value.trim() : value }, { onConflict: 'key' })
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  const { data } = await supabase.from('config').select('key, value')
  return NextResponse.json(toResponse((data || []) as ConfigRow[]))
}
