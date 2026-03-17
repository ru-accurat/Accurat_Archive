'use client'

import { useRouter, usePathname } from 'next/navigation'

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()

  return (
    <div className="flex flex-col h-screen bg-[var(--c-black)]">
      {/* Title bar */}
      <div className="h-[var(--topbar-h)] flex items-center px-[48px] shrink-0 bg-[var(--c-black)]">
        <div className="flex items-center gap-6 w-full">
          <button
            onClick={() => router.push('/')}
            className="text-[11px] font-[500] tracking-[0.08em] uppercase text-white/60 hover:text-white/90 transition-colors duration-200"
          >
            Accurat Archive
          </button>
          <div className="flex-1" />
          <button
            onClick={() => router.push('/tags')}
            className="text-[11px] font-[400] tracking-[0.02em] text-white/40 hover:text-white/80 transition-colors duration-200"
          >
            Tags
          </button>
          <button
            onClick={() => router.push('/settings')}
            className="text-white/40 hover:text-white/80 transition-colors duration-200"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 9a2 2 0 100-4 2 2 0 000 4z" stroke="currentColor" strokeWidth="1.2" />
              <path d="M5.7 1.3l-.4 1.2a4.5 4.5 0 00-1 .6L3.1 2.7l-1.3.8.3 1.3a4.5 4.5 0 000 1.2l-.3 1.3 1.3.8 1.2-.4a4.5 4.5 0 001 .6l.4 1.2h1.6l.4-1.2a4.5 4.5 0 001-.6l1.2.4 1.3-.8-.3-1.3a4.5 4.5 0 000-1.2l.3-1.3-1.3-.8-1.2.4a4.5 4.5 0 00-1-.6L8.3 1.3H5.7z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            onClick={() => router.push('/new')}
            className="text-[11px] font-[450] tracking-[0.02em] px-4 py-1.5 rounded-[var(--radius-sm)] bg-white/10 text-white/70 hover:bg-white/15 hover:text-white transition-all duration-200"
          >
            + New Project
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  )
}
