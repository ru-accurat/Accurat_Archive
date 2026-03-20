'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createBrowserClient()
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    router.push(redirect)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        autoFocus
        className="w-full px-3 py-2.5 rounded-[var(--radius-sm)] bg-white/5 border border-white/10 text-[14px] text-white placeholder:text-white/25 outline-none focus:border-white/25 transition-colors"
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        className="w-full px-3 py-2.5 rounded-[var(--radius-sm)] bg-white/5 border border-white/10 text-[14px] text-white placeholder:text-white/25 outline-none focus:border-white/25 transition-colors"
      />

      {error && (
        <p className="text-[12px] text-[var(--c-error)]">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 rounded-[var(--radius-sm)] bg-white/10 text-[13px] font-[450] text-white/80 hover:bg-white/15 hover:text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {loading ? 'Signing in...' : 'Sign in'}
      </button>
    </form>
  )
}

export default function LoginPage() {
  return (
    <div className="w-full max-w-[360px]">
      <div className="text-center mb-8">
        <h1 className="text-[11px] font-[500] tracking-[0.08em] uppercase text-white/60 mb-2">
          Accurat Archive
        </h1>
        <p className="text-[13px] text-white/30">Sign in to continue</p>
      </div>

      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  )
}
