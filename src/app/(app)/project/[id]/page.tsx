'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useProjectDetail } from '@/hooks/use-project-detail'
import { useKeyboardNav } from '@/hooks/use-keyboard-nav'
import { useFilteredProjects, useFilterOptions } from '@/hooks/use-filters'
import { useProjectStore } from '@/stores/project-store'
import { api } from '@/lib/api-client'
import { toast } from '@/lib/toast'
import { projectToSummary } from '@/lib/db-utils'
import { pdfUrl } from '@/lib/media-url'
import type { Project, HistoryEntry } from '@/lib/types'

import { ProjectHero } from '@/components/project/ProjectHero'
import { ProjectMetadata } from '@/components/project/ProjectMetadata'
import { ProjectDescriptions } from '@/components/project/ProjectDescriptions'
import { ProjectTagsSection } from '@/components/project/ProjectTagsSection'
import { ProjectLinksSection } from '@/components/project/ProjectLinksSection'
import { ProjectMediaSection } from '@/components/project/ProjectMediaSection'
import { ProjectSidebar } from '@/components/project/ProjectSidebar'
import { ProjectAIBar } from '@/components/project/ProjectAIBar'

import { EditableField } from '@/components/edit/EditableField'
import { EditableTagsField } from '@/components/edit/EditableTagsField'
import { ChecklistTagField } from '@/components/edit/ChecklistTagField'
import { EditableUrlsField } from '@/components/edit/EditableUrlsField'
import { EditableMetadata } from '@/components/edit/EditableMetadata'
import { MediaManager } from '@/components/edit/MediaManager'
import { HistoryPanel } from '@/components/edit/HistoryPanel'
import { RelatedProjects } from '@/components/project/RelatedProjects'
import { LinkedEngagements } from '@/components/project/LinkedEngagements'
import dynamic from 'next/dynamic'

const AiDiffModal = dynamic(() => import('@/components/edit/AiDiffModal').then(m => m.AiDiffModal), { ssr: false })
const CaseStudyWriter = dynamic(() => import('@/components/edit/CaseStudyWriter').then(m => m.CaseStudyWriter), { ssr: false })
const InUseGenerator = dynamic(() => import('@/components/edit/InUseGenerator').then(m => m.InUseGenerator), { ssr: false })
import { Breadcrumb } from '@/components/shared/Breadcrumb'

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { project, media, setMedia, heroMedia, galleryMedia, loading, setProject, refreshMedia } = useProjectDetail(id)
  const filteredProjects = useFilteredProjects()
  const filterOptions = useFilterOptions()
  const updateProjectInStore = useProjectStore((s) => s.updateProject)
  const removeProjectFromStore = useProjectStore((s) => s.removeProject)

  const [editMode, setEditMode] = useState(false)
  const [draft, setDraft] = useState<Project | null>(null)
  const [saving, setSaving] = useState(false)
  const [heroFilename, setHeroFilename] = useState<string | null>(null)
  const [thumbFilename, setThumbFilename] = useState<string | null>(null)
  const [aiResult, setAiResult] = useState<{ field: string; text: string } | null>(null)
  const [allTags, setAllTags] = useState<{ domains: string[]; services: string[]; outputs: string[] }>({ domains: [], services: [], outputs: [] })
  const [uploadProgress, setUploadProgress] = useState<{ active: boolean; message: string; done: boolean }>({ active: false, message: '', done: false })
  const [caseStudyWriterOpen, setCaseStudyWriterOpen] = useState(false)
  const [inUseGeneratorOpen, setInUseGeneratorOpen] = useState(false)
  const [sharePopover, setSharePopover] = useState(false)
  const [sharingLoading, setSharingLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const pdfInputRef = useRef<HTMLInputElement>(null)

  // Fetch all tags from DB when entering edit mode
  useEffect(() => {
    if (editMode) {
      api.getAllTags().then(setAllTags).catch(console.error)
    }
  }, [editMode])

  useKeyboardNav(editMode ? [] : filteredProjects, id)

  const enterEdit = useCallback(() => {
    if (project) {
      setDraft({ ...project })
      setHeroFilename(project.heroImage || heroMedia?.filename || null)
      setThumbFilename(project.thumbImage || null)
      setEditMode(true)
    }
  }, [project, heroMedia])

  const cancelEdit = useCallback(() => { setDraft(null); setEditMode(false) }, [])

  const saveEdit = useCallback(async () => {
    if (!draft || !id) return
    setSaving(true)
    try {
      const fullName = `${draft.client} - ${draft.projectName}`
      // Exclude media-managed fields from save payload — these are updated by media upload routes
      const { mediaOrder: _mo, ...saveDraft } = draft
      const updated = await api.updateProject(id, { ...saveDraft, fullName })
      setProject(updated)
      updateProjectInStore(id, projectToSummary(updated))
      setEditMode(false)
      setDraft(null)
      toast.success('Project saved')
    } catch (err) {
      console.error('Failed to save:', err)
      toast.error('Failed to save changes: ' + String(err), { retry: () => saveEdit() })
    }
    setSaving(false)
  }, [draft, id, setProject, updateProjectInStore])

  const setField = useCallback(<K extends keyof Project>(key: K, value: Project[K]) => {
    setDraft((prev) => (prev ? { ...prev, [key]: value } : null))
  }, [])

  // Click-to-edit: PATCH a single field immediately and update local + store.
  const handleFieldUpdate = useCallback(async (field: keyof Project, value: unknown) => {
    if (!id || !project) return
    const prevValue = (project as unknown as Record<string, unknown>)[field as string]
    if (prevValue === value) return
    // Optimistic local update
    setProject((prev) => prev ? ({ ...prev, [field]: value } as Project) : prev)
    try {
      const updated = await api.updateProject(id, { [field]: value } as Partial<Project>)
      setProject(updated)
      updateProjectInStore(id, projectToSummary(updated))
      toast.success('Saved')
    } catch (err) {
      console.error('Field update failed:', err)
      // Revert on failure
      setProject((prev) => prev ? ({ ...prev, [field]: prevValue } as Project) : prev)
      toast.error('Failed to save: ' + String(err))
    }
  }, [id, project, setProject, updateProjectInStore])

  const handleRestore = useCallback((entry: HistoryEntry) => {
    if (confirm('Restore this version? Current unsaved changes will be lost.')) {
      setDraft({ ...entry.project })
    }
  }, [])

  const handleAddMedia = useCallback(() => { fileInputRef.current?.click() }, [])

  const handleFilesSelected = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!id || !e.target.files?.length) return
    const count = e.target.files.length
    setUploadProgress({ active: true, message: `Uploading ${count} file${count > 1 ? 's' : ''}...`, done: false })
    try {
      const result = await api.addMedia(id, e.target.files)
      if (result.success) {
        setUploadProgress({ active: true, message: `${count} file${count > 1 ? 's' : ''} uploaded successfully`, done: true })
        await refreshMedia()
        setTimeout(() => setUploadProgress({ active: false, message: '', done: false }), 1500)
      } else {
        setUploadProgress({ active: false, message: '', done: false })
        toast.error('Upload failed. Please try again.')
      }
    } catch (err) {
      console.error('Media upload error:', err)
      setUploadProgress({ active: false, message: '', done: false })
      toast.error('Upload failed: ' + String(err))
    }
    e.target.value = ''
  }, [id, refreshMedia])

  const handleDeleteMedia = useCallback(async (filenames: string[]) => {
    if (!id || filenames.length === 0) return
    setUploadProgress({ active: true, message: `Deleting ${filenames.length} file${filenames.length > 1 ? 's' : ''}...`, done: false })
    try {
      const result = await api.batchDeleteMedia(id, filenames)
      if (result.success) {
        setUploadProgress({ active: true, message: 'Deleted successfully', done: true })
        await refreshMedia()
        setTimeout(() => setUploadProgress({ active: false, message: '', done: false }), 1500)
      }
    } catch (err) {
      console.error('Batch delete error:', err)
      setUploadProgress({ active: false, message: '', done: false })
      toast.error('Failed to delete media: ' + String(err))
    }
  }, [id, refreshMedia])

  const handleReorderMedia = useCallback(async (orderedFilenames: string[]) => {
    if (!id) return
    // Update local state immediately for snappy UI
    setMedia((prev) => {
      const byName = new Map(prev.map((m) => [m.filename, m]))
      return orderedFilenames.map((fn) => byName.get(fn)).filter(Boolean) as typeof prev
    })
    setField('mediaOrder', orderedFilenames)
    // Persist to DB
    try {
      await api.reorderMedia(id, orderedFilenames)
    } catch (err) {
      console.error('Reorder error:', err)
    }
  }, [id, setField])

  const handleUploadLogo = useCallback(() => { logoInputRef.current?.click() }, [])

  const handleLogoSelected = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!id || !e.target.files?.length) return
    try {
      const result = await api.uploadLogo(id, e.target.files[0])
      if (result.success) {
        setField('clientLogo', result.filename)
        setProject((prev) => prev ? { ...prev, clientLogo: result.filename } : null)
      }
    } catch (err) {
      console.error('Logo upload error:', err)
      toast.error('Logo upload failed: ' + String(err))
    }
    e.target.value = ''
  }, [id, setField, setProject])

  const handleDeleteLogo = useCallback(async () => {
    if (!id) return
    if (!confirm('Delete client logo?')) return
    try {
      const result = await api.deleteLogo(id)
      if (result.success) {
        setField('clientLogo', undefined as unknown as string)
        setProject((prev) => prev ? { ...prev, clientLogo: undefined } : null)
      }
    } catch (err) {
      console.error('Logo delete error:', err)
      toast.error('Failed to delete logo: ' + String(err))
    }
  }, [id, setField, setProject])

  const handleAddPdfs = useCallback(() => { pdfInputRef.current?.click() }, [])

  const handlePdfFilesSelected = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!id || !e.target.files?.length) return
    const count = e.target.files.length
    setUploadProgress({ active: true, message: `Uploading ${count} PDF${count > 1 ? 's' : ''}...`, done: false })
    try {
      const result = await api.addPdfs(id, e.target.files)
      if (result.success) {
        setUploadProgress({ active: true, message: `${count} PDF${count > 1 ? 's' : ''} uploaded`, done: true })
        // Refresh project to get updated pdf_files
        const updated = await api.getProject(id)
        setProject(updated)
        if (draft) setDraft((prev) => prev ? { ...prev, pdfFiles: updated.pdfFiles } : null)
        setTimeout(() => setUploadProgress({ active: false, message: '', done: false }), 1500)
      } else {
        setUploadProgress({ active: false, message: '', done: false })
        toast.error('PDF upload failed.')
      }
    } catch (err) {
      setUploadProgress({ active: false, message: '', done: false })
      toast.error('PDF upload failed: ' + String(err))
    }
    e.target.value = ''
  }, [id, draft, setProject])

  const handleDeletePdfs = useCallback(async (filenames: string[]) => {
    if (!id || filenames.length === 0) return
    setUploadProgress({ active: true, message: `Deleting ${filenames.length} PDF${filenames.length > 1 ? 's' : ''}...`, done: false })
    try {
      const result = await api.batchDeletePdfs(id, filenames)
      if (result.success) {
        setUploadProgress({ active: true, message: 'Deleted successfully', done: true })
        const updated = await api.getProject(id)
        setProject(updated)
        if (draft) setDraft((prev) => prev ? { ...prev, pdfFiles: updated.pdfFiles } : null)
        setTimeout(() => setUploadProgress({ active: false, message: '', done: false }), 1500)
      }
    } catch (err) {
      setUploadProgress({ active: false, message: '', done: false })
      toast.error('Failed to delete PDFs: ' + String(err))
    }
  }, [id, draft, setProject])

  const handleRenamePdf = useCallback(async (oldName: string, newName: string) => {
    if (!id) return
    try {
      const result = await api.renamePdf(id, oldName, newName)
      if (result.success) {
        const updated = await api.getProject(id)
        setProject(updated)
        if (draft) setDraft((prev) => prev ? { ...prev, pdfFiles: updated.pdfFiles } : null)
      }
    } catch (err) {
      toast.error('Failed to rename PDF: ' + String(err))
    }
  }, [id, draft, setProject])

  const handleDelete = useCallback(async () => {
    if (!id || !project) return
    if (!confirm(`Delete "${project.client} - ${project.projectName}"? This cannot be undone.`)) return
    try {
      await api.deleteProject(id)
      removeProjectFromStore(id)
      toast.success('Project deleted')
      router.push('/')
    } catch (err) {
      toast.error('Failed to delete: ' + String(err))
    }
  }, [id, project, router, removeProjectFromStore])

  const handleAiAccept = useCallback(() => {
    if (!aiResult || !draft) return
    setDraft((prev) => prev ? {
      ...prev,
      [aiResult.field]: aiResult.text,
      aiGenerated: [...new Set([...(prev.aiGenerated || []), aiResult.field])]
    } : null)
    setAiResult(null)
  }, [aiResult, draft])

  if (loading) {
    return <div className="flex items-center justify-center h-full bg-[var(--c-black)] text-white/30 text-[13px] font-[350]">Loading...</div>
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 bg-[var(--c-black)]">
        <span className="text-white/30 text-[13px] font-[350]">Project not found</span>
        <button onClick={() => router.push('/')} className="text-[13px] font-[400] text-white/50 hover:text-white transition-colors duration-200">Back to index</button>
      </div>
    )
  }

  const p = editMode && draft ? draft : project
  const isAi = (field: string) => p.aiGenerated?.includes(field) || false

  // Hidden file inputs for media and logo upload
  const fileInput = (
    <>
      <input ref={fileInputRef} type="file" multiple accept="image/*,video/*,.heic,.heif,.avif" className="hidden" onChange={handleFilesSelected} />
      <input ref={logoInputRef} type="file" accept=".svg,image/svg+xml,image/png,image/jpeg" className="hidden" onChange={handleLogoSelected} />
      <input ref={pdfInputRef} type="file" multiple accept=".pdf,application/pdf" className="hidden" onChange={handlePdfFilesSelected} />
    </>
  )

  if (editMode) {
    return (
      <div className="h-full overflow-y-auto bg-[var(--c-white)]">
        {fileInput}
        <div className="sticky top-0 z-40 bg-[var(--c-white)] border-b border-[var(--c-gray-200)]">
          <div className="max-w-[1040px] px-4 sm:px-6 md:px-[48px] py-3 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Breadcrumb items={[
                { label: 'Projects', href: '/' },
                { label: `${p.client} — ${p.projectName}` },
              ]} />
              <button onClick={cancelEdit} className="text-[11px] font-[400] text-[var(--c-gray-400)] hover:text-[var(--c-gray-900)] transition-colors duration-200">Cancel</button>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCaseStudyWriterOpen(true)}
                className="text-[11px] font-[450] px-3 py-1.5 rounded-[var(--radius-sm)] bg-[var(--c-ai)]/10 text-[var(--c-ai)] hover:bg-[var(--c-ai)]/20 transition-colors"
              >
                Write Case Study
              </button>
              <div className="text-[11px] font-[500] uppercase tracking-[0.08em] text-[var(--c-gray-400)]">Editing</div>
            </div>
            <button onClick={saveEdit} disabled={saving} className="text-[12px] font-[500] px-5 py-1.5 rounded-[var(--radius-sm)] bg-[var(--c-gray-900)] text-white hover:bg-[var(--c-gray-800)] transition-colors duration-200 disabled:opacity-40">
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
        <div className="max-w-[1040px] px-4 sm:px-6 md:px-[48px] py-10">
          <EditableField title="Project Name" value={p.projectName} onChange={(v) => setField('projectName', v)} large multiline={false} />
          <EditableMetadata
            client={p.client} client2={p.client2 || ''} agency={p.agency || ''} start={p.start} end={p.end} section={p.section} tier={p.tier} output={p.output} status={p.status}
            locationName={p.locationName || ''} latitude={p.latitude ?? null} longitude={p.longitude ?? null}
            onClientChange={(v) => setField('client', v)}
            onClient2Change={(v) => setField('client2', v || null)}
            onAgencyChange={(v) => setField('agency', v || null)}
            onStartChange={(v) => setField('start', v)} onEndChange={(v) => setField('end', v)}
            onSectionChange={(v) => setField('section', v)} onTierChange={(v) => setField('tier', v)} onOutputChange={(v) => setField('output', v)}
            onStatusChange={(v) => setField('status', v)}
            onLocationNameChange={(v) => setField('locationName', v)} onLatitudeChange={(v) => setField('latitude', v)} onLongitudeChange={(v) => setField('longitude', v)}
            outputOptions={allTags.outputs}
          />
          <div className="mt-6">
            <ChecklistTagField title="Domains" tags={p.domains} onChange={(v) => setField('domains', v)} allTags={allTags.domains} />
            <ChecklistTagField title="Services" tags={p.services} onChange={(v) => setField('services', v)} allTags={allTags.services} />
          </div>
          <div className="mt-8">
            <EditableField title="Tagline" value={p.tagline} onChange={(v) => setField('tagline', v)} large isAiGenerated={isAi('tagline')} />
          </div>
          <EditableField title="Description" value={p.description} onChange={(v) => setField('description', v)} isAiGenerated={isAi('description')} />
          <EditableField title="Challenge" value={p.challenge} onChange={(v) => setField('challenge', v)} isAiGenerated={isAi('challenge')} />
          <EditableField title="Solution" value={p.solution} onChange={(v) => setField('solution', v)} isAiGenerated={isAi('solution')} />
          <EditableField title="Deliverables" value={p.deliverables} onChange={(v) => setField('deliverables', v)} isAiGenerated={isAi('deliverables')} />
          <EditableField title="Client Quotes" value={p.clientQuotes} onChange={(v) => setField('clientQuotes', v)} isAiGenerated={isAi('clientQuotes')} />
          <EditableUrlsField urls={p.urls} onChange={(v) => setField('urls', v)} />
          <EditableTagsField title="Team" tags={p.team} onChange={(v) => setField('team', v)} placeholder="Add team member..." />
          <MediaManager
            media={media} folderName={p.folderName} heroFilename={heroFilename} thumbFilename={thumbFilename}
            clientLogo={p.clientLogo || null}
            pdfFiles={p.pdfFiles || []}
            onHeroChange={(filename) => { setHeroFilename(filename); setField('heroImage', filename) }}
            onThumbChange={(filename) => { setThumbFilename(filename); setField('thumbImage', filename) }}
            onGalleryReorder={handleReorderMedia}
            onAddMedia={handleAddMedia} onDeleteMedia={handleDeleteMedia}
            onUploadLogo={handleUploadLogo} onDeleteLogo={handleDeleteLogo}
            onAddPdfs={handleAddPdfs} onDeletePdfs={handleDeletePdfs} onRenamePdf={handleRenamePdf}
          />
          {media.length > 0 && (
            <div className="mt-4">
              <button
                onClick={() => setInUseGeneratorOpen(true)}
                className="text-[11px] font-[450] px-3 py-1.5 rounded-[var(--radius-sm)] bg-[var(--c-ai)]/10 text-[var(--c-ai)] hover:bg-[var(--c-ai)]/20 transition-colors"
              >
                Generate In-Use Image
              </button>
            </div>
          )}
          <HistoryPanel projectId={p.id} onRestore={handleRestore} />
          <div className="mt-12 pt-8 border-t border-[var(--c-gray-200)]">
            <button onClick={handleDelete} className="text-[11px] font-[450] px-4 py-2 rounded-[var(--radius-sm)] text-red-500 hover:bg-red-50 transition-colors duration-200">Delete Project</button>
          </div>
          <div className="h-20" />
        </div>
        <AiDiffModal
          open={!!aiResult} onClose={() => setAiResult(null)} fieldName={aiResult?.field || ''}
          currentText={aiResult ? String((p as unknown as Record<string, unknown>)[aiResult.field] || '') : ''}
          generatedText={aiResult?.text || ''} onAccept={handleAiAccept} onEdit={handleAiAccept}
        />
        {uploadProgress.active && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
            <div className="bg-white rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] px-8 py-6 flex flex-col items-center gap-3 min-w-[240px]">
              {!uploadProgress.done ? (
                <div className="w-6 h-6 border-2 border-[var(--c-gray-300)] border-t-[var(--c-gray-900)] rounded-full animate-spin" />
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M5 13l4 4L19 7" stroke="var(--c-gray-900)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              <span className="text-[13px] font-[450] text-[var(--c-gray-700)]">{uploadProgress.message}</span>
            </div>
          </div>
        )}

        <CaseStudyWriter
          open={caseStudyWriterOpen}
          projectId={p.id}
          currentValues={{
            tagline: p.tagline,
            description: p.description,
            challenge: p.challenge,
            solution: p.solution,
            deliverables: p.deliverables,
          }}
          onClose={() => setCaseStudyWriterOpen(false)}
          onAccept={(fields) => {
            for (const [key, value] of Object.entries(fields)) {
              setField(key as keyof Project, value as never)
            }
          }}
        />

        <InUseGenerator
          open={inUseGeneratorOpen}
          projectId={p.id}
          folderName={p.folderName}
          media={media}
          onClose={() => setInUseGeneratorOpen(false)}
          onImageSaved={(filename, asThumbnail) => {
            refreshMedia()
            if (asThumbnail && filename) {
              setField('thumbImage', filename)
            }
          }}
        />
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto bg-[var(--c-black)]">
      {fileInput}
      <div className="bg-[var(--c-black)] text-white">
        <div className="sticky top-0 z-40 bg-[var(--c-black)]/80 backdrop-blur-xl">
          <div className="max-w-[1040px] px-4 sm:px-6 md:px-[48px] py-3 flex items-center justify-between">
            <Breadcrumb dark items={[
              { label: 'Projects', href: '/' },
              { label: `${p.client} — ${p.projectName}` },
            ]} />
            <div className="flex items-center gap-3">
              <div className="relative">
                <button
                  onClick={() => setSharePopover(!sharePopover)}
                  className="text-[11px] font-[400] tracking-[0.02em] px-3 py-1.5 text-white/40 hover:text-white/70 transition-colors duration-200"
                >
                  Share
                </button>
                {sharePopover && (
                  <div className="absolute right-0 top-9 w-72 bg-[var(--c-white)] border border-[var(--c-gray-200)] rounded-[var(--radius-md)] shadow-lg p-4 z-50">
                    {p.shareToken ? (
                      <div>
                        <p className="text-[11px] font-[450] text-[var(--c-gray-700)] mb-2">Shareable link</p>
                        <div className="flex items-center gap-2 mb-3">
                          <input
                            readOnly
                            value={`${window.location.origin}/share/${p.shareToken}`}
                            className="flex-1 text-[11px] text-[var(--c-gray-500)] bg-[var(--c-gray-50)] border border-[var(--c-gray-200)] rounded-[var(--radius-sm)] px-2.5 py-1.5 outline-none"
                          />
                          <button
                            onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/share/${p.shareToken}`); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
                            className="text-[10px] font-[500] px-2.5 py-1.5 rounded-[var(--radius-sm)] bg-[var(--c-gray-900)] text-white hover:bg-[var(--c-gray-800)] transition-colors"
                          >
                            {copied ? 'Copied!' : 'Copy'}
                          </button>
                        </div>
                        <button
                          onClick={async () => { setSharingLoading(true); await fetch(`/api/projects/${id}/share-token`, { method: 'DELETE' }); setProject((prev) => prev ? { ...prev, shareToken: null } : null); setSharingLoading(false) }}
                          disabled={sharingLoading}
                          className="text-[11px] text-[var(--c-error)] hover:text-[var(--c-error)]/80 transition-colors disabled:opacity-50"
                        >
                          Revoke link
                        </button>
                      </div>
                    ) : (
                      <div>
                        <p className="text-[11px] text-[var(--c-gray-500)] mb-3">Generate a shareable link for this project.</p>
                        <button
                          onClick={async () => { setSharingLoading(true); const res = await fetch(`/api/projects/${id}/share-token`, { method: 'POST' }); const data = await res.json(); setProject((prev) => prev ? { ...prev, shareToken: data.token } : null); setSharingLoading(false) }}
                          disabled={sharingLoading}
                          className="text-[11px] font-[450] px-4 py-1.5 rounded-[var(--radius-sm)] bg-[var(--c-gray-900)] text-white hover:bg-[var(--c-gray-800)] transition-colors disabled:opacity-50"
                        >
                          {sharingLoading ? 'Generating...' : 'Generate link'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <button onClick={enterEdit} className="text-[11px] font-[450] tracking-[0.02em] px-4 py-1.5 rounded-[var(--radius-sm)] bg-white/10 text-white/60 hover:bg-white/15 hover:text-white transition-all duration-200">Edit All</button>
            </div>
          </div>
        </div>

        <ProjectHero project={p} heroMedia={heroMedia} onUpdate={handleFieldUpdate} />

        <div className="max-w-[1040px] px-4 sm:px-6 md:px-[48px] pb-12 space-y-6">
          <ProjectMetadata project={p} onUpdate={handleFieldUpdate} />
          <ProjectTagsSection project={p} onUpdate={handleFieldUpdate} dark />
        </div>
      </div>

      <ProjectDescriptions project={p} onUpdate={handleFieldUpdate} />

      <div className="bg-[var(--c-white)]">
        <div className="max-w-[1040px] px-4 sm:px-6 md:px-[48px] pt-12 pb-16">
          <div className="mb-12">
            <ProjectLinksSection project={p} onUpdate={handleFieldUpdate} />
          </div>
          <ProjectMediaSection
            project={p}
            galleryMedia={galleryMedia}
            onAddMedia={handleAddMedia}
            onDeleteMedia={(filename) => handleDeleteMedia([filename])}
            onSetHero={(filename) => handleFieldUpdate('heroImage', filename)}
            onSetThumb={(filename) => handleFieldUpdate('thumbImage', filename)}
          />
          <ProjectSidebar project={p} />
        </div>
      </div>

      <ProjectAIBar
        onWriteCaseStudy={() => setCaseStudyWriterOpen(true)}
        onGenerateInUse={() => setInUseGeneratorOpen(true)}
        hasMedia={media.length > 0}
      />

      <CaseStudyWriter
        open={caseStudyWriterOpen}
        projectId={p.id}
        currentValues={{
          tagline: p.tagline,
          description: p.description,
          challenge: p.challenge,
          solution: p.solution,
          deliverables: p.deliverables,
        }}
        onClose={() => setCaseStudyWriterOpen(false)}
        onAccept={async (fields) => {
          for (const [key, value] of Object.entries(fields)) {
            await handleFieldUpdate(key as keyof Project, value)
          }
        }}
      />

      <InUseGenerator
        open={inUseGeneratorOpen}
        projectId={p.id}
        folderName={p.folderName}
        media={media}
        onClose={() => setInUseGeneratorOpen(false)}
        onImageSaved={(filename, asThumbnail) => {
          refreshMedia()
          if (asThumbnail && filename) {
            handleFieldUpdate('thumbImage', filename)
          }
        }}
      />

      <div className="bg-[var(--c-black)] h-20" />
      <div className="hidden md:block fixed bottom-5 right-5 text-[10px] font-[400] tracking-[0.04em] text-white/20 bg-[var(--c-black)]/80 backdrop-blur-sm px-3 py-1.5 rounded-[var(--radius-sm)]">← → navigate</div>
    </div>
  )
}
