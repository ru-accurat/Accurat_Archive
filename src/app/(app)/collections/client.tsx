'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { EmptyState } from '@/components/shared/EmptyState'
import { NewCollectionWizard } from '@/components/collections/NewCollectionWizard'
import { useProjects } from '@/hooks/use-projects'

export interface CollectionSummary {
  id: string
  name: string
  description: string
  projectCount: number
  createdAt: string
}

export function CollectionsPageClient({ initialCollections }: { initialCollections: CollectionSummary[] }) {
  const router = useRouter()
  // Ensure project store is hydrated so the wizard's manual picker works
  useProjects()
  const [collections] = useState<CollectionSummary[]>(initialCollections)
  const [wizardOpen, setWizardOpen] = useState(false)

  return (
    <div className="h-full overflow-y-auto bg-[var(--c-white)]">
      <div className="max-w-[720px] px-4 sm:px-6 md:px-[48px] py-10">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-[1.4rem] font-[300] tracking-[-0.02em] text-[var(--c-gray-900)]">Collections</h1>
          <button
            onClick={() => setWizardOpen(true)}
            className="text-[11px] font-[450] px-4 py-2 rounded-[var(--radius-sm)] bg-[var(--c-gray-900)] text-white hover:bg-[var(--c-gray-800)] transition-colors"
          >
            + New Collection
          </button>
        </div>

        {collections.length === 0 ? (
          <EmptyState
            title="No collections yet"
            description="Group projects into collections for easy sharing and organization."
            action={{ label: 'Create a collection', onClick: () => setWizardOpen(true) }}
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
                    <p className="text-[12px] text-[var(--c-gray-400)] mt-0.5 line-clamp-1">{c.description}</p>
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

      <NewCollectionWizard open={wizardOpen} onClose={() => setWizardOpen(false)} />
    </div>
  )
}
