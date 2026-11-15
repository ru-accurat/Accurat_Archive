import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { requireEditor } from '@/lib/api-auth'
import { logActivity } from '@/lib/activity'
import { baseName } from '@/lib/project-media'

// PATCH /api/projects/[id]/media/caption  Body: { mediaId: string, caption: string }
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const deny = await requireEditor()
  if (deny) return deny
  const { id } = await params
  const body = await request.json().catch(() => null) as { mediaId?: unknown; caption?: unknown } | null
  if (typeof body?.mediaId !== 'string' || typeof body?.caption !== 'string') {
    return NextResponse.json({ error: 'Send mediaId and caption' }, { status: 400 })
  }
  const caption = body.caption.trim()
  if (caption.includes('—')) {
    return NextResponse.json({ error: 'Captions cannot contain em dashes' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data: row } = await supabase
    .from('project_media')
    .select('id, path, caption')
    .eq('id', body.mediaId)
    .eq('project_id', id)
    .single()
  if (!row) return NextResponse.json({ error: 'Media not found' }, { status: 404 })
  if (row.caption === caption) return NextResponse.json({ success: true, caption })

  const { error: logError } = await supabase.from('consolidation_log').insert({
    batch: `app-media-caption-${new Date().toISOString().slice(0, 10)}`,
    project_id: id,
    table_name: 'project_media',
    record_id: row.id,
    field: 'caption',
    old_value: row.caption,
    new_value: caption,
    source: 'manual',
    note: 'Archive app: caption edited',
  })
  if (logError) return NextResponse.json({ error: `Log failed, nothing changed: ${logError.message}` }, { status: 500 })

  const { error } = await supabase.from('project_media').update({ caption }).eq('id', row.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logActivity('media.captioned', { file: baseName(row.path) }, id)
  return NextResponse.json({ success: true, caption })
}
