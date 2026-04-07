import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase'
import { PresentationClient } from './client'

interface Props {
  params: Promise<{ token: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params
  const supabase = createServiceClient()
  const { data: collection } = await supabase
    .from('collections')
    .select('name')
    .eq('share_token', token)
    .single()
  return { title: collection ? `${collection.name} — Presentation` : 'Presentation' }
}

export default async function PresentationPage({ params }: Props) {
  const { token } = await params
  return <PresentationClient token={token} />
}
