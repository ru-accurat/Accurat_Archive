import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createServiceClient } from './supabase'
import type { Role } from './auth'

/** Read the current user's role from profiles. Returns null if not signed in
 *  or no profile row. Used by API routes to enforce role-based access. */
export async function getCurrentRole(): Promise<Role | null> {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() { /* readonly in route handlers */ },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Use service client so we don't depend on RLS for the profile row
  const service = createServiceClient()
  const { data } = await service
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  return (data?.role as Role) ?? null
}

/** Returns a 403 response if the current role is not in `allowed`. */
export async function requireRole(allowed: Role[]): Promise<NextResponse | null> {
  const role = await getCurrentRole()
  if (!role) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!allowed.includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return null
}

/** Shortcut for routes only admins/editors should hit. */
export const requireEditor = () => requireRole(['admin', 'editor'])
/** Shortcut for routes content_reader must never see. */
export const requireBusinessAccess = () =>
  requireRole(['admin', 'editor', 'viewer'])
