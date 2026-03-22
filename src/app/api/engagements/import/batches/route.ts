import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { rowToImportBatch } from '@/lib/db-utils'
import type { ImportBatchRow } from '@/lib/db-utils'

export async function GET() {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('import_batches')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json((data as ImportBatchRow[]).map(rowToImportBatch))
}
