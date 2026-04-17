import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { CONTENT_READER_BLOCKED_PREFIXES, type Role } from './auth'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Public routes that don't need auth
  const publicPaths = ['/login', '/portfolio', '/share/', '/collection/']
  const isPublicPath = publicPaths.some((p) => pathname.startsWith(p))

  // API routes handle their own auth
  const isApiPath = pathname.startsWith('/api/')

  // Static assets
  const isStaticPath = pathname.startsWith('/_next/') || pathname.startsWith('/favicon')

  if (!user && !isPublicPath && !isApiPath && !isStaticPath) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  // Role-based route gating: content_reader is blocked from Clients /
  // Engagements / Needs-Attention sections. Do a best-effort lookup via the
  // service role; if it fails (misconfig), we fail open to avoid locking out.
  if (user && !isApiPath && !isStaticPath) {
    const blocked = CONTENT_READER_BLOCKED_PREFIXES.some((p) => pathname.startsWith(p))
    if (blocked) {
      try {
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (serviceKey) {
          const admin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            serviceKey,
            { auth: { persistSession: false, autoRefreshToken: false } }
          )
          const { data } = await admin
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()
          const role = (data?.role as Role | undefined) ?? null
          if (role === 'content_reader') {
            const url = request.nextUrl.clone()
            url.pathname = '/'
            url.search = ''
            return NextResponse.redirect(url)
          }
        }
      } catch {
        // fail open
      }
    }
  }

  return supabaseResponse
}
