'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from '@/lib/toast'

export function PublishButton({ projectId }: { projectId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [published, setPublished] = useState(false)

  const handlePublish = async () => {
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/publish`, {
        method: 'POST',
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Failed to publish')
      }
      setPublished(true)
      toast.success('Project published')
      startTransition(() => {
        router.refresh()
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to publish')
    }
  }

  if (published) {
    return (
      <div className="text-[11px] text-[var(--c-success)] font-[500]">Published</div>
    )
  }

  return (
    <button
      type="button"
      onClick={handlePublish}
      disabled={isPending}
      className="w-full text-[11px] font-[500] py-1.5 px-2 rounded-[var(--radius-sm)] bg-[var(--c-black)] text-white hover:bg-[var(--c-gray-800)] disabled:opacity-50 transition-colors"
    >
      {isPending ? 'Publishing…' : 'Publish'}
    </button>
  )
}
