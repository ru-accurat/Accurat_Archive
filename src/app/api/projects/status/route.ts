import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { requireEditor } from '@/lib/api-auth'
import { applyStatusChange } from '@/lib/project-status-server'
import { isProjectStatus, STATUS_LABELS } from '@/lib/status'

// POST /api/projects/status  Body: { ids: string[], status: 'draft' | 'archive_only' | 'private' | 'public' }
// Batch status change from the project list. Projects that can change, change; the others come
// back in `skipped` with the reason (for example, not ready for the website).
export async function POST(request: Request) {
  const deny = await requireEditor()
  if (deny) return deny
  const body = await request.json().catch(() => null) as { ids?: unknown; status?: unknown } | null
  const ids = Array.isArray(body?.ids) ? body!.ids.filter((x): x is string => typeof x === 'string') : []
  if (ids.length === 0 || !isProjectStatus(body?.status)) {
    return NextResponse.json({ error: 'Send ids (non-empty) and status (draft, archive_only, private or public)' }, { status: 400 })
  }
  if (ids.length > 500) return NextResponse.json({ error: 'At most 500 projects at a time' }, { status: 400 })

  try {
    const result = await applyStatusChange(createServiceClient(), ids, body.status, `Archive app: batch set to ${STATUS_LABELS[body.status]}`)
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
