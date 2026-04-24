import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { requireBusinessAccess } from '@/lib/api-auth'
import { buildProjectsZip } from '@/lib/zip-export'

// POST /api/zip/media — "Download all media as ZIP"
// All images + videos + gifs in project-media. No JSON, no PDFs, no logos.
export async function POST(request: Request) {
  const deny = await requireBusinessAccess()
  if (deny) return deny
  const { projectIds } = await request.json()
  if (!projectIds?.length) {
    return NextResponse.json({ error: 'projectIds array is required' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const stream = buildProjectsZip({
    supabase,
    projectIds,
    includeJson: false,
    scope: 'all_media',
  })

  const date = new Date().toISOString().slice(0, 10)
  return new Response(stream, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="accurat-archive-media-${date}.zip"`,
    },
  })
}

export const maxDuration = 300
