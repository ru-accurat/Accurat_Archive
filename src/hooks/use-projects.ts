'use client'

import { useEffect } from 'react'
import { useProjectStore } from '@/stores/project-store'
import { api } from '@/lib/api-client'

export function useProjects() {
  const { projects, loading, setProjects, setLoading } = useProjectStore()

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const data = await api.getProjects()
        if (!cancelled) setProjects(data)
      } catch (err) {
        console.error('Failed to load projects:', err)
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  return { projects, loading }
}
