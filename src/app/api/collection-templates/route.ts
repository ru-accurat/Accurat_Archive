import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { requireSignedIn } from '@/lib/api-auth'

// GET /api/collection-templates — list available collection templates
export async function GET() {
  const deny = await requireSignedIn()
  if (deny) return deny

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('collection_templates')
    .select('id, name, description, groups')
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data || [])
}
