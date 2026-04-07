'use client'

import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  feature?: string
}

export function MobileOnlyNotice({ children, feature }: Props) {
  return (
    <>
      <div className="hidden md:block h-full">{children}</div>
      <div className="md:hidden flex items-center justify-center h-full px-6 py-12 bg-[var(--c-white)]">
        <div className="max-w-[280px] text-center">
          <div className="text-[11px] font-[500] uppercase tracking-[0.1em] text-[var(--c-gray-400)] mb-3">
            Desktop view
          </div>
          <h2 className="text-[18px] font-[300] text-[var(--c-gray-900)] mb-2">
            {feature ? `${feature} works best on desktop` : 'Best viewed on desktop'}
          </h2>
          <p className="text-[12px] font-[400] text-[var(--c-gray-500)] leading-relaxed">
            This view is designed for larger screens. Open the archive on a desktop or tablet for the full experience.
          </p>
        </div>
      </div>
    </>
  )
}
