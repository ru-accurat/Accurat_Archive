'use client'

import { Toaster } from 'sonner'
import { AppShell } from '@/components/layout/AppShell'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppShell>{children}</AppShell>
      <Toaster
        position="bottom-right"
        visibleToasts={3}
        toastOptions={{
          style: {
            background: 'var(--c-white)',
            color: 'var(--c-gray-900)',
            border: '1px solid var(--c-gray-200)',
            borderRadius: 'var(--radius-md)',
            fontSize: '13px',
            fontWeight: 400,
          },
          className: 'accurat-toast',
        }}
      />
    </>
  )
}
