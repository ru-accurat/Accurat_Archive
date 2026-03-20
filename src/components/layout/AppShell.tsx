'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { profile, loading, signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  const navigate = (path: string) => {
    router.push(path)
    setMenuOpen(false)
  }

  // Close user menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    if (userMenuOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [userMenuOpen])

  const initials = profile?.displayName
    ? profile.displayName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : profile?.email?.slice(0, 2).toUpperCase() || '?'

  const roleBadgeColor = profile?.role === 'admin'
    ? 'bg-[var(--c-accent)]/20 text-[var(--c-accent-muted)]'
    : profile?.role === 'editor'
      ? 'bg-[var(--c-success)]/20 text-[var(--c-success)]'
      : 'bg-white/10 text-white/40'

  return (
    <div className="flex flex-col h-screen bg-[var(--c-black)]">
      {/* Title bar */}
      <div className="h-[var(--topbar-h)] flex items-center px-4 sm:px-6 md:px-[48px] shrink-0 bg-[var(--c-black)] relative z-50">
        <div className="flex items-center gap-6 w-full">
          <button
            onClick={() => navigate('/')}
            className="text-[11px] font-[500] tracking-[0.08em] uppercase text-white/60 hover:text-white/90 transition-colors duration-200"
          >
            Accurat Archive
          </button>
          <div className="flex-1" />

          {/* Desktop nav */}
          <div className="hidden sm:flex items-center gap-6">
            <button
              onClick={() => navigate('/tags')}
              className="text-[11px] font-[400] tracking-[0.02em] text-white/40 hover:text-white/80 transition-colors duration-200"
            >
              Tags
            </button>
            <button
              onClick={() => navigate('/activity')}
              className="text-[11px] font-[400] tracking-[0.02em] text-white/40 hover:text-white/80 transition-colors duration-200"
            >
              Activity
            </button>
            <button
              onClick={() => navigate('/settings')}
              className="text-white/40 hover:text-white/80 transition-colors duration-200"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 9a2 2 0 100-4 2 2 0 000 4z" stroke="currentColor" strokeWidth="1.2" />
                <path d="M5.7 1.3l-.4 1.2a4.5 4.5 0 00-1 .6L3.1 2.7l-1.3.8.3 1.3a4.5 4.5 0 000 1.2l-.3 1.3 1.3.8 1.2-.4a4.5 4.5 0 001 .6l.4 1.2h1.6l.4-1.2a4.5 4.5 0 001-.6l1.2.4 1.3-.8-.3-1.3a4.5 4.5 0 000-1.2l.3-1.3-1.3-.8-1.2.4a4.5 4.5 0 00-1-.6L8.3 1.3H5.7z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              onClick={() => navigate('/new')}
              className="text-[11px] font-[450] tracking-[0.02em] px-4 py-1.5 rounded-[var(--radius-sm)] bg-white/10 text-white/70 hover:bg-white/15 hover:text-white transition-all duration-200"
            >
              + New Project
            </button>

            {/* User menu */}
            {!loading && profile && (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="w-7 h-7 rounded-full bg-white/10 text-[10px] font-[500] text-white/60 hover:bg-white/15 hover:text-white/80 transition-all duration-200 flex items-center justify-center"
                >
                  {initials}
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 top-9 w-52 bg-[var(--c-gray-900)] border border-white/10 rounded-[var(--radius-md)] shadow-lg py-1 z-50">
                    <div className="px-3 py-2.5 border-b border-white/10">
                      <p className="text-[12px] text-white/70 truncate">{profile.displayName || profile.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[10px] font-[500] px-1.5 py-0.5 rounded-[var(--radius-sm)] ${roleBadgeColor}`}>
                          {profile.role}
                        </span>
                        <span className="text-[11px] text-white/30 truncate">{profile.email}</span>
                      </div>
                    </div>
                    <button
                      onClick={signOut}
                      className="w-full text-left px-3 py-2 text-[12px] text-white/50 hover:text-white/80 hover:bg-white/5 transition-colors"
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="sm:hidden text-white/50 hover:text-white/80 transition-colors duration-200 p-1"
          >
            {menuOpen ? (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M4 4l10 10M14 4l-10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M3 5h12M3 9h12M3 13h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="sm:hidden bg-[var(--c-black)] border-t border-white/10 px-4 py-3 flex flex-col gap-3 z-40">
          <button onClick={() => navigate('/tags')} className="text-left text-[12px] font-[400] text-white/50 hover:text-white/80 py-1.5">
            Tags
          </button>
          <button onClick={() => navigate('/activity')} className="text-left text-[12px] font-[400] text-white/50 hover:text-white/80 py-1.5">
            Activity
          </button>
          <button onClick={() => navigate('/settings')} className="text-left text-[12px] font-[400] text-white/50 hover:text-white/80 py-1.5">
            Settings
          </button>
          <button onClick={() => navigate('/new')} className="text-left text-[12px] font-[450] text-white/70 hover:text-white py-1.5">
            + New Project
          </button>
          {!loading && profile && (
            <div className="border-t border-white/10 pt-3 mt-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[12px] text-white/50">{profile.displayName || profile.email}</span>
                <span className={`text-[9px] font-[500] px-1.5 py-0.5 rounded-[var(--radius-sm)] ${roleBadgeColor}`}>
                  {profile.role}
                </span>
              </div>
              <button onClick={signOut} className="text-left text-[12px] text-white/40 hover:text-white/70 py-1">
                Sign out
              </button>
            </div>
          )}
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  )
}
