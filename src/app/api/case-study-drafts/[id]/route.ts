import { NextResponse } from 'next/server'
import { createAuthServerClient } from '@/lib/supabase-server'
import { requireEditor } from '@/lib/api-auth'

// DELETE /api/case-study-drafts/[id]
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const deny = await requireEditor()
  if (deny) return deny
  const { id } = await params
  const supabase = await createAuthServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { error } = await supabase
    .from('case_study_drafts')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
