'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useProjectDetail } from '@/hooks/use-project-detail'
import { useKeyboardNav } from '@/hooks/use-keyboard-nav'
import { useFilteredProjects, useFilterOptions } from '@/hooks/use-filters'
import { useProjectStore } from '@/stores/project-store'
import { api } from '@/lib/api-client'
import { pdfUrl } from '@/lib/media-url'
import type { Project, HistoryEntry } from '@/lib/types'

import { HeroSection } from '@/components/project/HeroSection'
import { TagChips } from '@/components/project/TagChips'
import { TextBlock } from '@/components/project/TextBlock'
import { GalleryGrid } from '@/components/project/GalleryGrid'
import { TeamList } from '@/components/project/TeamList'
import { UrlLinks } from '@/components/project/UrlLinks'

import { EditableField } from '@/components/edit/EditableField'
import { EditableTagsField } from '@/components/edit/EditableTagsField'
import { ChecklistTagField } from '@/components/edit/ChecklistTagField'
import { EditableUrlsField } from '@/components/edit/EditableUrlsField'
import { EditableMetadata } from '@/components/edit/EditableMetadata'
import { MediaManager } from '@/components/edit/MediaManager'
import { HistoryPanel } from '@/components/edit/HistoryPanel'
import { AiDiffModal } from '@/components/edit/AiDiffModal'
import { RelatedProjects } from '@/components/project/RelatedProjects'

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
  const [heroIndex, setHeroIndex] = useState(0)
  const [thumbIndex, setThumbIndex] = useState(-1)
  const [generatingField, setGeneratingField] = useState<string | null>(null)
  const [aiResult, setAiResult] = useState<{ field: string; text: string } | null>(null)
  const [allTags, setAllTags] = useState<{ domains: string[]; services: string[]; outputs: string[] }>({ domains: [], services: [], outputs: [] })
  const [uploadProgress, setUploadProgress] = useState<{ active: boolean; message: string; done: boolean }>({ active: false, message: '', done: false })
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
      const heroFile = project.heroImage || heroMedia?.filename
      if (heroFile) {
        const idx = media.findIndex((m) => m.filename === heroFile)
        setHeroIndex(idx >= 0 ? idx : 0)
      } else {
        setHeroIndex(0)
      }
      if (project.thumbImage) {
        const tIdx = media.findIndex((m) => m.filename === project.thumbImage)
        setThumbIndex(tIdx >= 0 ? tIdx : -1)
      } else {
        setThumbIndex(-1)
      }
      setEditMode(true)
    }
  }, [project, media, heroMedia])

  const cancelEdit = useCallback(() => { setDraft(null); setEditMode(false) }, [])

  const saveEdit = useCallback(async () => {
    if (!draft || !id) return
    setSaving(true)
    try {
      const fullName = `${draft.client} - ${draft.projectName}`
      const updated = await api.updateProject(id, { ...draft, fullName })
      setProject(updated)
      updateProjectInStore(id, updated)
      setEditMode(false)
      setDraft(null)
    } catch (err) {
      console.error('Failed to save:', err)
      alert('Failed to save changes.')
    }
    setSaving(false)
  }, [draft, id, setProject, updateProjectInStore])

  const setField = useCallback(<K extends keyof Project>(key: K, value: Project[K]) => {
    setDraft((prev) => (prev ? { ...prev, [key]: value } : null))
  }, [])

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
        alert('Upload failed. Please try again.')
      }
    } catch (err) {
      console.error('Media upload error:', err)
      setUploadProgress({ active: false, message: '', done: false })
      alert('Upload failed: ' + String(err))
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
      alert('Failed to delete media: ' + String(err))
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
      alert('Logo upload failed: ' + String(err))
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
      alert('Failed to delete logo: ' + String(err))
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
        alert('PDF upload failed.')
      }
    } catch (err) {
      setUploadProgress({ active: false, message: '', done: false })
      alert('PDF upload failed: ' + String(err))
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
      alert('Failed to delete PDFs: ' + String(err))
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
      alert('Failed to rename PDF: ' + String(err))
    }
  }, [id, draft, setProject])

  const handleDelete = useCallback(async () => {
    if (!id || !project) return
    if (!confirm(`Delete "${project.client} - ${project.projectName}"? This cannot be undone.`)) return
    try {
      await api.deleteProject(id)
      removeProjectFromStore(id)
      router.push('/')
    } catch (err) {
      alert('Failed to delete: ' + String(err))
    }
  }, [id, project, router, removeProjectFromStore])

  const handleGenerate = useCallback(async (fieldName: string) => {
    if (!id) return
    setGeneratingField(fieldName)
    try {
      const result = await api.generateField(id, fieldName)
      if (result.success) setAiResult({ field: fieldName, text: result.text })
      else alert(result.message || 'Generation failed')
    } catch (err) { alert(String(err)) }
    setGeneratingField(null)
  }, [id])

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
            <button onClick={cancelEdit} className="text-[12px] font-[400] text-[var(--c-gray-400)] hover:text-[var(--c-gray-900)] transition-colors duration-200">Cancel</button>
            <div className="text-[11px] font-[500] uppercase tracking-[0.08em] text-[var(--c-gray-400)]">Editing</div>
            <button onClick={saveEdit} disabled={saving} className="text-[12px] font-[500] px-5 py-1.5 rounded-[var(--radius-sm)] bg-[var(--c-gray-900)] text-white hover:bg-[var(--c-gray-800)] transition-colors duration-200 disabled:opacity-40">
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
        <div className="max-w-[1040px] px-4 sm:px-6 md:px-[48px] py-10">
          <EditableField title="Project Name" value={p.projectName} onChange={(v) => setField('projectName', v)} large multiline={false} />
          <EditableMetadata
            client={p.client} start={p.start} end={p.end} section={p.section} tier={p.tier} output={p.output} status={p.status}
            locationName={p.locationName || ''} latitude={p.latitude ?? null} longitude={p.longitude ?? null}
            onClientChange={(v) => setField('client', v)} onStartChange={(v) => setField('start', v)} onEndChange={(v) => setField('end', v)}
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
            <EditableField title="Tagline" value={p.tagline} onChange={(v) => setField('tagline', v)} large isAiGenerated={isAi('tagline')} onGenerate={() => handleGenerate('tagline')} generating={generatingField === 'tagline'} />
          </div>
          <EditableField title="Description" value={p.description} onChange={(v) => setField('description', v)} isAiGenerated={isAi('description')} onGenerate={() => handleGenerate('description')} generating={generatingField === 'description'} />
          <EditableField title="Challenge" value={p.challenge} onChange={(v) => setField('challenge', v)} isAiGenerated={isAi('challenge')} onGenerate={() => handleGenerate('challenge')} generating={generatingField === 'challenge'} />
          <EditableField title="Solution" value={p.solution} onChange={(v) => setField('solution', v)} isAiGenerated={isAi('solution')} onGenerate={() => handleGenerate('solution')} generating={generatingField === 'solution'} />
          <EditableField title="Deliverables" value={p.deliverables} onChange={(v) => setField('deliverables', v)} isAiGenerated={isAi('deliverables')} onGenerate={() => handleGenerate('deliverables')} generating={generatingField === 'deliverables'} />
          <EditableField title="Client Quotes" value={p.clientQuotes} onChange={(v) => setField('clientQuotes', v)} isAiGenerated={isAi('clientQuotes')} onGenerate={() => handleGenerate('clientQuotes')} generating={generatingField === 'clientQuotes'} />
          <EditableUrlsField urls={p.urls} onChange={(v) => setField('urls', v)} />
          <EditableTagsField title="Team" tags={p.team} onChange={(v) => setField('team', v)} placeholder="Add team member..." />
          <MediaManager
            media={media} folderName={p.folderName} heroIndex={heroIndex} thumbIndex={thumbIndex}
            clientLogo={p.clientLogo || null}
            pdfFiles={p.pdfFiles || []}
            onHeroChange={(idx) => { setHeroIndex(idx); if (media[idx]) setField('heroImage', media[idx].filename) }}
            onThumbChange={(idx) => { setThumbIndex(idx); if (media[idx]) setField('thumbImage', media[idx].filename) }}
            onGalleryReorder={handleReorderMedia}
            onAddMedia={handleAddMedia} onDeleteMedia={handleDeleteMedia}
            onUploadLogo={handleUploadLogo} onDeleteLogo={handleDeleteLogo}
            onAddPdfs={handleAddPdfs} onDeletePdfs={handleDeletePdfs} onRenamePdf={handleRenamePdf}
          />
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
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto bg-[var(--c-black)]">
      <div className="bg-[var(--c-black)] text-white">
        <div className="sticky top-0 z-40 bg-[var(--c-black)]/80 backdrop-blur-xl">
          <div className="max-w-[1040px] px-4 sm:px-6 md:px-[48px] py-3 flex items-center justify-between">
            <button onClick={() => router.push('/')} className="text-[12px] font-[400] text-white/30 hover:text-white/70 transition-colors duration-200">&larr; Back</button>
            <button onClick={enterEdit} className="text-[11px] font-[450] tracking-[0.02em] px-4 py-1.5 rounded-[var(--radius-sm)] bg-white/10 text-white/60 hover:bg-white/15 hover:text-white transition-all duration-200">Edit</button>
          </div>
        </div>
        <HeroSection media={heroMedia} folderName={p.folderName} projectName={p.projectName} />
        <div className="max-w-[1040px] px-4 sm:px-6 md:px-[48px] pt-16 pb-12">
          <h1 className="text-[1.8rem] sm:text-[2.2rem] md:text-[2.8rem] font-[250] tracking-[-0.03em] leading-[1.1] mb-[12px] text-white">{p.projectName}</h1>
          <div className="flex flex-wrap items-center gap-3 sm:gap-5 text-[13px] sm:text-[15px] mb-[24px]">
            <span className="font-[500] text-white/90">{p.client}</span>
            {(p.start || p.end) && <span className="text-white/40 font-[400] tabular-nums">{p.start}{p.end && p.end !== p.start ? `–${p.end}` : ''}</span>}
            {p.section && <span className="text-[12px] font-[450] tracking-[0.06em] uppercase text-white/40">{p.section}</span>}
            <span className="text-[12px] font-[400] tracking-[0.04em] text-white/25 uppercase">Tier {p.tier}</span>
            {p.status && p.status !== 'draft' && (
              <span className={`text-[10px] font-[500] tracking-[0.06em] uppercase px-2 py-0.5 rounded-[var(--radius-sm)] ${
                p.status === 'public' ? 'bg-[var(--c-success)]/20 text-[var(--c-success)]' : 'bg-[var(--c-accent)]/20 text-[var(--c-accent-muted)]'
              }`}>
                {p.status}
              </span>
            )}
          </div>
          <TagChips domains={p.domains} services={p.services} output={p.output} dark />
        </div>
      </div>

      <div className="bg-[var(--c-white)]">
        <div className="max-w-[1040px] px-4 sm:px-6 md:px-[48px] pt-16 pb-12">
          {p.tagline && <div className="mb-12"><TextBlock title="Tagline" content={p.tagline} large isAiGenerated={isAi('tagline')} /></div>}
          {p.description && <TextBlock title="Description" content={p.description} isAiGenerated={isAi('description')} />}
          {!p.tagline && !p.description && <TextBlock title="Tagline" content="" />}
        </div>
      </div>

      {(p.challenge || p.solution) && (
        <div className="bg-[var(--c-white)]">
          <div className="max-w-[1040px] px-4 sm:px-6 md:px-[48px] py-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16">
              <TextBlock title="Challenge" content={p.challenge} isAiGenerated={isAi('challenge')} />
              <TextBlock title="Solution" content={p.solution} isAiGenerated={isAi('solution')} />
            </div>
          </div>
        </div>
      )}

      {p.deliverables && (
        <div className="bg-[var(--c-white)]">
          <div className="max-w-[1040px] px-4 sm:px-6 md:px-[48px] py-12">
            <TextBlock title="Deliverables" content={p.deliverables} isAiGenerated={isAi('deliverables')} />
          </div>
        </div>
      )}

      {p.clientQuotes && (
        <div className="bg-[var(--c-black)]">
          <div className="max-w-[1040px] px-4 sm:px-6 md:px-[48px] py-12">
            <TextBlock title="Client Quote" content={p.clientQuotes} large dark isAiGenerated={isAi('clientQuotes')} />
          </div>
        </div>
      )}

      <div className="bg-[var(--c-white)]">
        <div className="max-w-[1040px] px-4 sm:px-6 md:px-[48px] pt-12 pb-16">
          {(p.urls.filter(Boolean).length > 0 || p.team.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 mb-12">
              <UrlLinks urls={p.urls} />
              <TeamList team={p.team} />
            </div>
          )}

          {/* Documents (PDFs) */}
          {(p.pdfFiles?.length ?? 0) > 0 && (
            <div className="mb-12">
              <h3 className="text-[10px] font-[500] uppercase tracking-[0.1em] text-[var(--c-gray-400)] mb-4">
                Documents
              </h3>
              <div className="space-y-2">
                {p.pdfFiles!.map((filename) => (
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
                    <a
                      href={pdfUrl(p.folderName, filename)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-[450] text-[var(--c-gray-400)] hover:text-[var(--c-gray-700)] transition-colors px-2 py-1"
                    >
                      View ↗
                    </a>
                    <a
                      href={pdfUrl(p.folderName, filename)}
                      download={filename}
                      className="text-[11px] font-[450] text-[var(--c-gray-400)] hover:text-[var(--c-gray-700)] transition-colors px-2 py-1"
                    >
                      Download
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          <GalleryGrid media={galleryMedia} folderName={p.folderName} />

          <div className="mt-16">
            <RelatedProjects projectId={p.id} />
          </div>
        </div>
      </div>

      <div className="bg-[var(--c-black)] h-20" />
      <div className="hidden md:block fixed bottom-5 right-5 text-[10px] font-[400] tracking-[0.04em] text-white/20 bg-[var(--c-black)]/80 backdrop-blur-sm px-3 py-1.5 rounded-[var(--radius-sm)]">← → navigate</div>
    </div>
  )
}
