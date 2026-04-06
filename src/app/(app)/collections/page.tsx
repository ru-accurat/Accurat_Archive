import { createServiceClient } from '@/lib/supabase'
import { CollectionsPageClient, type CollectionSummary } from './client'

export const dynamic = 'force-dynamic'

async function fetchCollections(): Promise<CollectionSummary[]> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('collections')
    .select('*, collection_items(project_id)')
    .order('created_at', { ascending: false })

  if (error || !data) return []

  return data.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description || '',
    projectCount: c.collection_items?.length || 0,
    createdAt: c.created_at,
  }))
}

export default async function CollectionsPage() {
  const collections = await fetchCollections()
  return <CollectionsPageClient initialCollections={collections} />
}
