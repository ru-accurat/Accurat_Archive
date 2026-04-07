'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { EmptyState } from '@/components/shared/EmptyState'
import { toast } from '@/lib/toast'

export interface CollectionSummary {
  id: string
  name: string
  description: string
  projectCount: number
  createdAt: string
}

interface CollectionTemplate {
  id: string
  name: string
  description: string
  groups: { name: string; subtitle?: string }[]
}

export function CollectionsPageClient({ initialCollections }: { initialCollections: CollectionSummary[] }) {
  const router = useRouter()
  const [collections] = useState<CollectionSummary[]>(initialCollections)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [templates, setTemplates] = useState<CollectionTemplate[]>([])
  const [templateId, setTemplateId] = useState<string>('')

  useEffect(() => {
    fetch('/api/collection-templates')
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setTemplates(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [])

  async function handleCreate() {
    if (!newName.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      })
      const data = await res.json()
      if (!data.id) {
        toast.error('Failed to create collection')
        setCreating(false)
        return
      }

      // Apply template if selected
      const tpl = templates.find((t) => t.id === templateId)
      if (tpl) {
        for (const g of tpl.groups) {
          try {
            const gRes = await fetch(`/api/collections/${data.id}/groups`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: g.name }),
            })
            if (!gRes.ok) continue
            const created = await gRes.json()
            if (created?.id && g.subtitle) {
              await fetch(`/api/collections/${data.id}/groups/${created.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subtitle: g.subtitle }),
              })
            }
          } catch {
            // ignore individual group failure
          }
        }
      }

      router.push(`/collections/${data.id}`)
    } catch {
      toast.error('Failed to create collection')
      setCreating(false)
    }
  }

  return (
    <div className="h-full overflow-y-auto bg-[var(--c-white)]">
      <div className="max-w-[720px] px-4 sm:px-6 md:px-[48px] py-10">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-[1.4rem] font-[300] tracking-[-0.02em] text-[var(--c-gray-900)]">Collections</h1>
        </div>

        <div className="flex gap-2 mb-2">
          <input
            type="text"
            placeholder="New collection name..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            className="flex-1 px-3 py-2 text-[13px] bg-transparent border-b border-[var(--c-gray-200)] focus:border-[var(--c-gray-900)] focus:outline-none transition-colors"
          />
          <button
            onClick={handleCreate}
            disabled={!newName.trim() || creating}
            className="text-[11px] font-[450] px-4 py-2 rounded-[var(--radius-sm)] bg-[var(--c-gray-900)] text-white hover:bg-[var(--c-gray-800)] transition-colors disabled:opacity-40"
          >
            Create
          </button>
        </div>

        {templates.length > 0 && (
          <div className="mb-8 flex items-center gap-2">
            <label className="text-[11px] text-[var(--c-gray-400)]">Template:</label>
            <select
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              className="text-[11px] bg-transparent border-b border-[var(--c-gray-200)] focus:border-[var(--c-gray-900)] focus:outline-none py-1 text-[var(--c-gray-700)]"
            >
              <option value="">None (blank)</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            {templateId && (
              <span className="text-[10px] text-[var(--c-gray-400)] italic">
                {templates.find((t) => t.id === templateId)?.description}
              </span>
            )}
          </div>
        )}

        {collections.length === 0 ? (
          <EmptyState
            title="No collections yet"
            description="Group projects into collections for easy sharing and organization."
            action={{ label: 'Create a collection', onClick: () => document.querySelector<HTMLInputElement>('input[placeholder*="collection"]')?.focus() }}
          />
        ) : (
          <div className="flex flex-col gap-2">
            {collections.map((c) => (
              <button
                key={c.id}
                onClick={() => router.push(`/collections/${c.id}`)}
                className="flex items-center justify-between px-4 py-3 rounded-[var(--radius-sm)] border border-[var(--c-gray-100)] hover:border-[var(--c-gray-200)] hover:bg-[var(--c-gray-50)] transition-all text-left"
              >
                <div>
                  <p className="text-[14px] font-[450] text-[var(--c-gray-800)]">{c.name}</p>
                  {c.description && (
                    <p className="text-[12px] text-[var(--c-gray-400)] mt-0.5">{c.description}</p>
                  )}
                </div>
                <span className="text-[11px] text-[var(--c-gray-400)] shrink-0 ml-4">
                  {c.projectCount} project{c.projectCount !== 1 ? 's' : ''}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
