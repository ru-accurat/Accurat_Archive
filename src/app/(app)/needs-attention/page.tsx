import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase'
import Image from 'next/image'
import { rowToProjectSummary, type ProjectSummaryRow } from '@/lib/db-utils'
import { mediaUrl } from '@/lib/media-url'
import type { ProjectSummary } from '@/lib/types'
import { PublishButton } from './client'

export const dynamic = 'force-dynamic'

interface AttentionRow extends ProjectSummaryRow {
  media_order: string[] | null
}

interface AttentionProject extends ProjectSummary {
  mediaCount: number
}

async function fetchAttentionData(): Promise<{
  noDescriptionByClient: Map<string, AttentionProject[]>
  lowMedia: AttentionProject[]
  readyToPublish: AttentionProject[]
  lowCompleteness: AttentionProject[]
}> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('projects')
    .select(
      'id, full_name, client, project_name, tier, section, start_year, end_year, domains, services, tagline, description, challenge, solution, deliverables, client_quotes, team, urls, output, folder_name, media_order, hero_image, thumb_image, ai_generated, client_logo, status, location_name, latitude, longitude'
    )
    .order('client', { ascending: true })
    .order('project_name', { ascending: true })

  if (error || !data) {
    return {
      noDescriptionByClient: new Map(),
      lowMedia: [],
      readyToPublish: [],
      lowCompleteness: [],
    }
  }

  const rows = data as AttentionRow[]

  const projects: AttentionProject[] = rows.map((r) => {
    const summary = rowToProjectSummary(r)
    const mediaCount = Array.isArray(r.media_order) ? r.media_order.length : 0
    return { ...summary, mediaCount }
  })

  // Bucket 1: No description, grouped by client
  const noDescriptionByClient = new Map<string, AttentionProject[]>()
  for (const p of projects) {
    if (!p.description || p.description.trim().length === 0) {
      const list = noDescriptionByClient.get(p.client) || []
      list.push(p)
      noDescriptionByClient.set(p.client, list)
    }
  }

  // Bucket 2: <3 media files
  const lowMedia = projects.filter((p) => p.mediaCount < 3)

  // Bucket 3: Ready to publish — completeness 10 and status draft
  const readyToPublish = projects.filter(
    (p) => p.completeness === 10 && p.status === 'draft'
  )

  // Bucket 4: completeness < 50% (i.e., < 5 of 10 fields)
  const lowCompleteness = projects.filter((p) => p.completeness < 5)

  return { noDescriptionByClient, lowMedia, readyToPublish, lowCompleteness }
}

function ProjectCard({
  project,
  showPublish = false,
  subtitle,
}: {
  project: AttentionProject
  showPublish?: boolean
  subtitle?: string
}) {
  return (
    <div className="border border-[var(--c-gray-100)] rounded-[var(--radius-sm)] overflow-hidden bg-white hover:border-[var(--c-gray-200)] transition-colors group flex flex-col">
      <Link
        href={`/project/${project.id}`}
        className="aspect-[4/3] bg-[var(--c-gray-50)] relative overflow-hidden block"
      >
        {project.thumbImage || project.heroImage ? (
          <Image
            src={mediaUrl(project.folderName, project.thumbImage || project.heroImage || '')}
            alt={project.fullName}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover group-hover:scale-[1.02] transition-transform duration-500"
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-[10px] text-[var(--c-gray-400)] uppercase tracking-wider">
            No media
          </div>
        )}
      </Link>
      <div className="p-3 flex-1 flex flex-col gap-1">
        <div className="text-[10px] font-[500] tracking-[0.08em] uppercase text-[var(--c-gray-400)]">
          {project.client}
        </div>
        <Link
          href={`/project/${project.id}`}
          className="text-[13px] font-[450] text-[var(--c-black)] hover:underline leading-tight line-clamp-2"
        >
          {project.projectName}
        </Link>
        {subtitle && (
          <div className="text-[11px] text-[var(--c-gray-500)] mt-1">{subtitle}</div>
        )}
        {showPublish && (
          <div className="mt-2">
            <PublishButton projectId={project.id} />
          </div>
        )}
      </div>
    </div>
  )
}

function Section({
  title,
  count,
  description,
  children,
}: {
  title: string
  count: number
  description: string
  children: React.ReactNode
}) {
  return (
    <section className="mb-12">
      <div className="flex items-baseline gap-3 mb-1">
        <h2 className="text-[15px] font-[500] text-[var(--c-black)] tracking-[-0.01em]">
          {title}
        </h2>
        <span className="text-[12px] text-[var(--c-gray-400)]">{count}</span>
      </div>
      <p className="text-[12px] text-[var(--c-gray-500)] mb-4">{description}</p>
      {count === 0 ? (
        <div className="text-[12px] text-[var(--c-gray-400)] italic border border-dashed border-[var(--c-gray-100)] rounded-[var(--radius-sm)] py-6 px-4 text-center">
          Nothing here — you&apos;re all caught up.
        </div>
      ) : (
        children
      )}
    </section>
  )
}

export default async function NeedsAttentionPage() {
  const {
    noDescriptionByClient,
    lowMedia,
    readyToPublish,
    lowCompleteness,
  } = await fetchAttentionData()

  const noDescriptionTotal = Array.from(noDescriptionByClient.values()).reduce(
    (s, arr) => s + arr.length,
    0
  )
  const noDescriptionClients = Array.from(noDescriptionByClient.entries()).sort(
    ([a], [b]) => a.localeCompare(b)
  )

  return (
    <div className="h-full overflow-y-auto bg-[var(--c-white)]">
      <div className="max-w-[1200px] px-4 sm:px-6 md:px-[48px] py-10">
        <div className="mb-10">
          <h1 className="text-[22px] font-[500] text-[var(--c-black)] tracking-[-0.02em] mb-2">
            Needs attention
          </h1>
          <p className="text-[13px] text-[var(--c-gray-500)]">
            Projects that could use a little love. Fix these and your archive will be in great shape.
          </p>
        </div>

        <Section
          title="Ready to publish"
          count={readyToPublish.length}
          description="All fields filled and still marked as draft. One click away from going public."
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {readyToPublish.map((p) => (
              <ProjectCard key={p.id} project={p} showPublish />
            ))}
          </div>
        </Section>

        <Section
          title="Missing description"
          count={noDescriptionTotal}
          description="Projects with no description, grouped by client."
        >
          <div className="space-y-6">
            {noDescriptionClients.map(([client, items]) => (
              <div key={client}>
                <div className="text-[11px] font-[500] tracking-[0.08em] uppercase text-[var(--c-gray-400)] mb-2">
                  {client}{' '}
                  <span className="text-[var(--c-gray-300)]">({items.length})</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {items.map((p) => (
                    <ProjectCard key={p.id} project={p} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section
          title="Fewer than 3 media files"
          count={lowMedia.length}
          description="Projects with thin media galleries. Consider adding more images."
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {lowMedia.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                subtitle={`${p.mediaCount} media file${p.mediaCount === 1 ? '' : 's'}`}
              />
            ))}
          </div>
        </Section>

        <Section
          title="Less than 50% complete"
          count={lowCompleteness.length}
          description="Projects with fewer than 5 of 10 scored fields filled in."
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {lowCompleteness.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                subtitle={`${p.completeness * 10}% complete`}
              />
            ))}
          </div>
        </Section>
      </div>
    </div>
  )
}
