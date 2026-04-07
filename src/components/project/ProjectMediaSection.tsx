'use client'

import type { Project, MediaFile } from '@/lib/types'
import { GalleryGrid } from '@/components/project/GalleryGrid'
import { pdfUrl } from '@/lib/media-url'

interface Props {
  project: Project
  galleryMedia: MediaFile[]
}

export function ProjectMediaSection({ project, galleryMedia }: Props) {
  return (
    <>
      {(project.pdfFiles?.length ?? 0) > 0 && (
        <div className="mb-12">
          <h3 className="text-[10px] font-[500] uppercase tracking-[0.1em] text-[var(--c-gray-400)] mb-4">Documents</h3>
          <div className="space-y-2">
            {project.pdfFiles!.map((filename) => (
              <div
                key={filename}
                className="flex items-center gap-3 px-4 py-3 rounded-[var(--radius-sm)] border border-[var(--c-gray-200)] bg-[var(--c-gray-50)] hover:bg-[var(--c-gray-100)] transition-colors duration-150"
              >
                <svg width="20" height="24" viewBox="0 0 20 24" fill="none" className="flex-shrink-0">
                  <rect x="0.5" y="0.5" width="19" height="23" rx="2" stroke="var(--c-gray-300)" />
                  <text x="10" y="16" textAnchor="middle" fill="var(--c-gray-400)" fontSize="7" fontWeight="600">PDF</text>
                </svg>
                <span className="flex-1 text-[13px] font-[400] text-[var(--c-gray-700)]">
                  {filename.replace(/\.pdf$/i, '')}
                </span>
                <a href={pdfUrl(project.folderName, filename)} target="_blank" rel="noopener noreferrer" className="text-[11px] font-[450] text-[var(--c-gray-400)] hover:text-[var(--c-gray-700)] transition-colors px-2 py-1">View ↗</a>
                <a href={pdfUrl(project.folderName, filename)} download={filename} className="text-[11px] font-[450] text-[var(--c-gray-400)] hover:text-[var(--c-gray-700)] transition-colors px-2 py-1">Download</a>
              </div>
            ))}
          </div>
        </div>
      )}
      <GalleryGrid media={galleryMedia} folderName={project.folderName} />
    </>
  )
}
