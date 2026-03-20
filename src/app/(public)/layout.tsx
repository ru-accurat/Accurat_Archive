import Link from 'next/link'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--c-white)]">
      <header className="h-[48px] flex items-center px-4 sm:px-6 md:px-[48px] shrink-0 bg-[var(--c-black)]">
        <Link
          href="/portfolio"
          className="text-[11px] font-[500] tracking-[0.08em] uppercase text-white/60 hover:text-white/90 transition-colors duration-200"
        >
          Accurat
        </Link>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="bg-[var(--c-black)] px-4 sm:px-6 md:px-[48px] py-6">
        <p className="text-[11px] text-white/30 tracking-[0.02em]">
          Accurat &mdash; Data-driven design and development
        </p>
      </footer>
    </div>
  )
}
