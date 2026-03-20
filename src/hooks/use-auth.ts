'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import type { UserProfile } from '@/lib/types'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createBrowserClient()

    async function getSession() {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (data) {
          setProfile({
            id: data.id,
            email: data.email,
            displayName: data.display_name,
            role: data.role,
          })
        }
      }

      setLoading(false)
    }

    getSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null)
        if (!session?.user) {
          setProfile(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  async function signOut() {
    const supabase = createBrowserClient()
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    window.location.href = '/login'
  }

  return { user, profile, loading, signOut }
}
