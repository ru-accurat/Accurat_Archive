import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { requireEditor } from '@/lib/api-auth'
import { logActivity } from '@/lib/activity'
import { baseName } from '@/lib/project-media'

type Kind = 'hero' | 'thumbnail'

// POST /api/projects/[id]/media/special-flag  Body: { mediaId: string, kind: 'hero' | 'thumbnail' }
//
// Sets the website hero or thumbnail. The website reads project_media.is_hero / is_thumbnail,
// so the flag moves to this row (one per project, enforced by a unique index), and
// projects.hero_image / thumb_image follow it for the Archive app.
// Rules: an image, never a video (the website never plays a hero video); and for a website
// project (deck_no set) a selected file, because the website only reads selected media.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const deny = await requireEditor()
  if (deny) return deny
  const { id } = await params
  const body = await request.json().catch(() => null) as { mediaId?: unknown; kind?: unknown } | null
  const kind = body?.kind as Kind
  if (typeof body?.mediaId !== 'string' || (kind !== 'hero' && kind !== 'thumbnail')) {
    return NextResponse.json({ error: 'Send mediaId and kind (hero or thumbnail)' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data: project } = await supabase.from('projects').select('*').eq('id', id).single()
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const { data: row } = await supabase
    .from('project_media')
    .select('id, path, kind, role, bucket, is_hero, is_thumbnail')
    .eq('id', body.mediaId)
    .eq('project_id', id)
    .single()
  if (!row) return NextResponse.json({ error: 'Media not found' }, { status: 404 })
  if (row.bucket !== 'project-media') return NextResponse.json({ error: 'Only files in project-media can be used' }, { status: 409 })
  if (row.kind !== 'image') return NextResponse.json({ error: 'The hero and thumbnail must be images' }, { status: 409 })
  if (project.deck_no != null && row.role !== 'selected') {
    return NextResponse.json({ error: 'Make the file selected first: the website reads only selected media' }, { status: 409 })
  }

  const flag = kind === 'hero' ? 'is_hero' : 'is_thumbnail'
  const projectField = kind === 'hero' ? 'hero_image' : 'thumb_image'
  const filename = baseName(row.path)
  if (row[flag] && project[projectField] === filename) return NextResponse.json({ success: true, filename })

  const { data: previous } = await supabase
    .from('project_media')
    .select('id')
    .eq('project_id', id)
    .eq(flag, true)

  const batch = `app-media-${kind}-${new Date().toISOString().slice(0, 10)}`
  const log = [
    ...(previous || []).filter((p) => p.id !== row.id).map((p) => ({
      batch, project_id: id, table_name: 'project_media', record_id: p.id, field: flag,
      old_value: true, new_value: false, source: 'manual', note: `Archive app: ${kind} changed`,
    })),
    ...(row[flag] ? [] : [{
      batch, project_id: id, table_name: 'project_media', record_id: row.id, field: flag,
      old_value: false, new_value: true, source: 'manual', note: `Archive app: ${kind} changed`,
    }]),
    ...(project[projectField] === filename ? [] : [{
      batch, project_id: id, table_name: 'projects', record_id: id, field: projectField,
      old_value: project[projectField], new_value: filename, source: 'manual', note: `Archive app: ${kind} changed`,
    }]),
  ]
  const { error: logError } = await supabase.from('consolidation_log').insert(log)
  if (logError) return NextResponse.json({ error: `Log failed, nothing changed: ${logError.message}` }, { status: 500 })

  await supabase.from('project_history').insert({ project_id: id, snapshot: project })

  // Clear first: the unique index allows one flagged row per project
  const { error: clearError } = await supabase
    .from('project_media')
    .update({ [flag]: false })
    .eq('project_id', id)
    .eq(flag, true)
    .neq('id', row.id)
  if (clearError) return NextResponse.json({ error: clearError.message }, { status: 500 })
  const { error: setError } = await supabase.from('project_media').update({ [flag]: true }).eq('id', row.id)
  if (setError) return NextResponse.json({ error: setError.message }, { status: 500 })
  const { error: projError } = await supabase.from('projects').update({ [projectField]: filename }).eq('id', id)
  if (projError) return NextResponse.json({ error: projError.message }, { status: 500 })

  await logActivity('project.updated', { projectName: project.full_name, fields: [projectField], file: filename }, id)
  return NextResponse.json({ success: true, filename })
}
