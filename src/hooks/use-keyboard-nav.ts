'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
export function useKeyboardNav(projects: { id: string }[], currentId?: string) {
  const router = useRouter()

  useEffect(() => {
    if (!currentId || projects.length === 0) return
    function handleKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      const currentIndex = projects.findIndex((p) => p.id === currentId)
      if (currentIndex === -1) return
      let nextIndex = -1
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault()
        nextIndex = Math.min(currentIndex + 1, projects.length - 1)
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        nextIndex = Math.max(currentIndex - 1, 0)
      }
      if (nextIndex >= 0 && nextIndex !== currentIndex) {
        router.push(`/project/${projects[nextIndex].id}`)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [projects, currentId, router])
}
