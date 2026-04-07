'use client'

import type { Project } from '@/lib/types'
import { RelatedProjects } from '@/components/project/RelatedProjects'
import { LinkedEngagements } from '@/components/project/LinkedEngagements'

interface Props {
  project: Project
}

export function ProjectSidebar({ project }: Props) {
  return (
    <>
      <LinkedEngagements projectId={project.id} clientName={project.client} />
      <div className="mt-16">
        <RelatedProjects projectId={project.id} />
      </div>
    </>
  )
}
