import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase'
import { SharedCollectionClient } from './client'

interface Props {
  params: Promise<{ token: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params
  const supabase = createServiceClient()

  const { data: collection } = await supabase
    .from('collections')
    .select('name, subtitle, description')
    .eq('share_token', token)
    .single()

  if (!collection) {
    return { title: 'Collection not found' }
  }

  const title = collection.subtitle
    ? `${collection.name} — ${collection.subtitle}`
    : collection.name

  return {
    title,
    description: collection.description || `A curated collection of ${collection.name} projects by Accurat.`,
    openGraph: {
      title,
      description: collection.description || `A curated collection of ${collection.name} projects by Accurat.`,
    },
  }
}

export default async function SharedCollectionPage({ params }: Props) {
  const { token } = await params
  return <SharedCollectionClient token={token} />
}
