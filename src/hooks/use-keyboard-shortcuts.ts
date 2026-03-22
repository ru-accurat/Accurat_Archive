'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'

export function useKeyboardShortcuts() {
  const router = useRouter()
  const pathname = usePathname()
  const pendingG = useRef(false)
  const gTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isInputFocused = useCallback(() => {
    const el = document.activeElement
    if (!el) return false
    const tag = el.tagName.toLowerCase()
    return tag === 'input' || tag === 'textarea' || tag === 'select' || (el as HTMLElement).isContentEditable
  }, [])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (isInputFocused()) return

      // Escape — close modals, exit edit mode
      if (e.key === 'Escape') {
        // Dispatch a custom event that modals/edit modes can listen to
        document.dispatchEvent(new CustomEvent('app:escape'))
        return
      }

      // "/" — focus search on index page
      if (e.key === '/' && pathname === '/') {
        e.preventDefault()
        const searchInput = document.querySelector<HTMLInputElement>('input[placeholder*="Search"]')
        searchInput?.focus()
        return
      }

      // "E" — toggle edit mode on project detail
      if (e.key === 'e' && pathname.startsWith('/project/')) {
        document.dispatchEvent(new CustomEvent('app:toggle-edit'))
        return
      }

      // "G" chord shortcuts — press G, then another key within 1s
      if (e.key === 'g' && !pendingG.current) {
        pendingG.current = true
        if (gTimer.current) clearTimeout(gTimer.current)
        gTimer.current = setTimeout(() => { pendingG.current = false }, 1000)
        return
      }

      if (pendingG.current) {
        pendingG.current = false
        if (gTimer.current) clearTimeout(gTimer.current)

        switch (e.key) {
          case 'p': router.push('/'); break
          case 't': router.push('/timeline'); break
          case 'm': router.push('/map'); break
          case 'c': router.push('/collections'); break
          case 'a': router.push('/activity'); break
          case 'g': router.push('/tags'); break
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [router, pathname, isInputFocused])
}
