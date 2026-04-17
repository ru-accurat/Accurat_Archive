import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { requireBusinessAccess } from '@/lib/api-auth'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ batchId: string }> }
) {
  const deny = await requireBusinessAccess()
  if (deny) return deny
  const { batchId } = await params
  const supabase = createServiceClient()

  // Delete all engagements in this batch (cascade deletes engagement_projects)
  const { data: deleted } = await supabase
    .from('engagements')
    .delete()
    .eq('import_batch_id', batchId)
    .select('id')

  // Delete the batch record
  await supabase.from('import_batches').delete().eq('id', batchId)

  return NextResponse.json({ deleted: deleted?.length || 0 })
}
