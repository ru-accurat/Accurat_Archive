import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

// POST /api/projects/[id]/media/reorder
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { mediaOrder } = await request.json() as { mediaOrder: string[] }

  if (!Array.isArray(mediaOrder)) {
    return NextResponse.json({ error: 'mediaOrder must be an array' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { error } = await supabase
    .from('projects')
    .update({ media_order: mediaOrder })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
