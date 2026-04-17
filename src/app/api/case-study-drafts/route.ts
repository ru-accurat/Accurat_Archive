import { NextResponse } from 'next/server'
import { createAuthServerClient } from '@/lib/supabase-server'
import { requireEditor } from '@/lib/api-auth'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any) {
  return {
    id: row.id,
    projectId: row.project_id,
    userId: row.user_id,
    notes: row.notes,
    fields: row.fields,
    quality: row.quality,
    referenceProjectId: row.reference_project_id,
    isIterative: row.is_iterative,
    tokensUsed: row.tokens_used,
    createdAt: row.created_at,
  }
}

// GET /api/case-study-drafts?projectId=...
export async function GET(request: Request) {
  const supabase = await createAuthServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('projectId')
  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('case_study_drafts')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json((data || []).map(mapRow))
}

// POST /api/case-study-drafts — create a draft after a successful generation
export async function POST(request: Request) {
  const deny = await requireEditor()
  if (deny) return deny
  const supabase = await createAuthServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { projectId, notes, fields, quality, referenceProjectId, isIterative, tokensUsed } = body

  if (!projectId || !fields || typeof fields !== 'object') {
    return NextResponse.json({ error: 'projectId and fields are required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('case_study_drafts')
    .insert({
      project_id: projectId,
      user_id: user.id,
      notes: notes || '',
      fields,
      quality: quality || 'fast',
      reference_project_id: referenceProjectId || null,
      is_iterative: !!isIterative,
      tokens_used: tokensUsed ?? null,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(mapRow(data))
}
