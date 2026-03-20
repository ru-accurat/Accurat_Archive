import { createClient } from '@supabase/supabase-js'
import { createBrowserClient as createSSRBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Client-side Supabase client with auth (cookie-based sessions)
export function createBrowserClient() {
  return createSSRBrowserClient(supabaseUrl, supabaseAnonKey)
}

// Server-side Supabase client (uses service role key, bypasses RLS)
// Use for admin operations, cron jobs, and public API routes
export function createServiceClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(supabaseUrl, serviceRoleKey)
}

// Legacy client-side client (for backwards compatibility during migration)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
