import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

// GET /api/tags — returns all unique tag values for domains, services, outputs
export async function GET() {
  const supabase = createServiceClient()

  const { data: projects } = await supabase
    .from('projects')
    .select('domains, services, output')

  const domains = new Set<string>()
  const services = new Set<string>()
  const outputs = new Set<string>()

  for (const p of projects || []) {
    if (Array.isArray(p.domains)) p.domains.forEach((d: string) => domains.add(d))
    if (Array.isArray(p.services)) p.services.forEach((s: string) => services.add(s))
    if (p.output) outputs.add(p.output)
  }

  return NextResponse.json({
    domains: [...domains].sort(),
    services: [...services].sort(),
    outputs: [...outputs].sort(),
  }, {
    headers: {
      'Cache-Control': 'private, max-age=60, stale-while-revalidate=600',
    },
  })
}
