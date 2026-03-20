'use client'

import { useEffect, useState } from 'react'

interface Collection {
  id: string
  name: string
  projectCount: number
}

interface Props {
  open: boolean
  onClose: () => void
  projectIds: string[]
}

export function CollectionPicker({ open, onClose, projectIds }: Props) {
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(false)
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetch('/api/collections')
      .then((r) => r.json())
      .then((data) => {
        setCollections(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [open])

  async function handleAdd(collectionId: string) {
    setAdding(collectionId)
    await fetch(`/api/collections/${collectionId}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectIds }),
    })
    setAdding(null)
    onClose()
  }

  async function handleCreate() {
    if (!newName.trim()) return
    setAdding('new')
    const res = await fetch('/api/collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim() }),
    })
    const data = await res.json()
    if (data.id) {
      await handleAdd(data.id)
    }
    setNewName('')
    setAdding(null)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-[var(--radius-lg)] shadow-lg w-full max-w-[400px] mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-[var(--c-gray-100)]">
          <h2 className="text-[14px] font-[500] text-[var(--c-gray-900)]">
            Add {projectIds.length} project{projectIds.length > 1 ? 's' : ''} to collection
          </h2>
        </div>

        <div className="p-5 max-h-[300px] overflow-y-auto">
          {loading ? (
            <p className="text-[13px] text-[var(--c-gray-400)]">Loading...</p>
          ) : collections.length === 0 ? (
            <p className="text-[13px] text-[var(--c-gray-400)] mb-3">No collections yet.</p>
          ) : (
            <div className="flex flex-col gap-1 mb-4">
              {collections.map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleAdd(c.id)}
                  disabled={adding !== null}
                  className="flex items-center justify-between px-3 py-2.5 rounded-[var(--radius-sm)] hover:bg-[var(--c-gray-50)] transition-colors text-left disabled:opacity-40"
                >
                  <span className="text-[13px] font-[400] text-[var(--c-gray-800)]">{c.name}</span>
                  <span className="text-[11px] text-[var(--c-gray-400)]">
                    {adding === c.id ? 'Adding...' : `${c.projectCount} projects`}
                  </span>
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-2 pt-2 border-t border-[var(--c-gray-100)]">
            <input
              type="text"
              placeholder="New collection..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              className="flex-1 px-3 py-2 text-[13px] border border-[var(--c-gray-200)] rounded-[var(--radius-sm)] focus:outline-none focus:border-[var(--c-gray-400)] transition-colors"
            />
            <button
              onClick={handleCreate}
              disabled={!newName.trim() || adding !== null}
              className="text-[11px] font-[450] px-3 py-2 rounded-[var(--radius-sm)] bg-[var(--c-gray-900)] text-white hover:bg-[var(--c-gray-800)] transition-colors disabled:opacity-40"
            >
              {adding === 'new' ? '...' : 'Create & Add'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
