'use client'

import { useEffect } from 'react'
import { useProjectStore } from '@/stores/project-store'
import { api } from '@/lib/api-client'

// Module-level flag so we don't refetch across client navigations within the same session
// until explicitly invalidated
let hasFetched = false

export function useProjects() {
  const { projects, loading, setProjects, setLoading } = useProjectStore()

  useEffect(() => {
    // Skip fetch if already loaded — avoid redundant roundtrips on navigation
    if (hasFetched && projects.length > 0) {
      if (loading) setLoading(false)
      return
    }

    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const data = await api.getProjects()
        if (!cancelled) {
          setProjects(data)
          hasFetched = true
        }
      } catch (err) {
        console.error('Failed to load projects:', err)
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { projects, loading }
}

// Call this after mutations that should invalidate the cached project list
export function invalidateProjectsCache() {
  hasFetched = false
}
