import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { requireSignedIn } from '@/lib/api-auth'
import type { Category } from '@/lib/types'

// GET /api/categories: the 8 deck sections, in number order
export async function GET() {
  const deny = await requireSignedIn()
  if (deny) return deny
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('categories')
    .select('id, number, name, slug, short_description')
    .order('number')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const categories: Category[] = (data || []).map((c) => ({
    id: c.id,
    number: c.number,
    name: c.name,
    slug: c.slug,
    shortDescription: c.short_description || '',
  }))
  return NextResponse.json(categories)
}
