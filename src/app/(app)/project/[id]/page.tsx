'use client'

import { useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useProjectDetail } from '@/hooks/use-project-detail'
import { useKeyboardNav } from '@/hooks/use-keyboard-nav'
import { useFilteredProjects, useFilterOptions } from '@/hooks/use-filters'
import { useProjectStore } from '@/stores/project-store'
import { api } from '@/lib/api-client'
import type { Project, HistoryEntry } from '@/lib/types'

import { HeroSection } from '@/components/project/HeroSection'
import { TagChips } from '@/components/project/TagChips'
import { TextBlock } from '@/components/project/TextBlock'
import { GalleryGrid } from '@/components/project/GalleryGrid'
import { TeamList } from '@/components/project/TeamList'
import { UrlLinks } from '@/components/project/UrlLinks'

import { EditableField } from '@/components/edit/EditableField'
import { EditableTagsField } from '@/components/edit/EditableTagsField'
import { EditableUrlsField } from '@/components/edit/EditableUrlsField'
import { EditableMetadata } from '@/components/edit/EditableMetadata'
import { MediaManager } from '@/components/edit/MediaManager'
import { HistoryPanel } from '@/components/edit/HistoryPanel'
import { AiDiffModal } from '@/components/edit/AiDiffModal'

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { project, media, setMedia, heroMedia, galleryMedia, loading, setProject } = useProjectDetail(id)
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
  const fileInputRef = useRef<HTMLInputElement>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)

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
    try {
      const result = await api.addMedia(id, e.target.files)
      if (result.success) {
        window.location.reload()
      } else {
        alert('Upload failed. Please try again.')
      }
    } catch (err) {
      console.error('Media upload error:', err)
      alert('Upload failed: ' + String(err))
    }
  }, [id])

  const handleDeleteMedia = useCallback(async (filenames: string[]) => {
    if (!id || filenames.length === 0) return
    try {
      const result = await api.batchDeleteMedia(id, filenames)
      if (result.success) window.location.reload()
    } catch (err) {
      console.error('Batch delete error:', err)
      alert('Failed to delete media: ' + String(err))
    }
  }, [id])

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
    </>
  )

  if (editMode) {
    return (
      <div className="h-full overflow-y-auto bg-[var(--c-white)]">
        {fileInput}
        <div className="sticky top-0 z-40 bg-[var(--c-white)] border-b border-[var(--c-gray-200)]">
          <div className="max-w-[1040px] mx-auto px-[80px] py-3 flex items-center justify-between">
            <button onClick={cancelEdit} className="text-[12px] font-[400] text-[var(--c-gray-400)] hover:text-[var(--c-gray-900)] transition-colors duration-200">Cancel</button>
            <div className="text-[11px] font-[500] uppercase tracking-[0.08em] text-[var(--c-gray-400)]">Editing</div>
            <button onClick={saveEdit} disabled={saving} className="text-[12px] font-[500] px-5 py-1.5 rounded-[var(--radius-sm)] bg-[var(--c-gray-900)] text-white hover:bg-[var(--c-gray-800)] transition-colors duration-200 disabled:opacity-40">
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
        <div className="max-w-[1040px] mx-auto px-[80px] py-10">
          <EditableField title="Project Name" value={p.projectName} onChange={(v) => setField('projectName', v)} large multiline={false} />
          <EditableMetadata
            client={p.client} start={p.start} end={p.end} section={p.section} tier={p.tier} output={p.output}
            onClientChange={(v) => setField('client', v)} onStartChange={(v) => setField('start', v)} onEndChange={(v) => setField('end', v)}
            onSectionChange={(v) => setField('section', v)} onTierChange={(v) => setField('tier', v)} onOutputChange={(v) => setField('output', v)}
            outputOptions={filterOptions.outputs}
          />
          <div className="mt-6">
            <EditableTagsField title="Domains" tags={p.domains} onChange={(v) => setField('domains', v)} suggestions={filterOptions.domains} />
            <EditableTagsField title="Services" tags={p.services} onChange={(v) => setField('services', v)} suggestions={filterOptions.services} />
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
            onHeroChange={(idx) => { setHeroIndex(idx); if (media[idx]) setField('heroImage', media[idx].filename) }}
            onThumbChange={(idx) => { setThumbIndex(idx); if (media[idx]) setField('thumbImage', media[idx].filename) }}
            onGalleryReorder={handleReorderMedia}
            onAddMedia={handleAddMedia} onDeleteMedia={handleDeleteMedia}
            onUploadLogo={handleUploadLogo} onDeleteLogo={handleDeleteLogo}
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
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto bg-[var(--c-black)]">
      <div className="bg-[var(--c-black)] text-white">
        <div className="sticky top-0 z-40 bg-[var(--c-black)]/80 backdrop-blur-xl">
          <div className="max-w-[1040px] mx-auto px-[80px] py-3 flex items-center justify-between">
            <button onClick={() => router.push('/')} className="text-[12px] font-[400] text-white/30 hover:text-white/70 transition-colors duration-200">&larr; Back</button>
            <button onClick={enterEdit} className="text-[11px] font-[450] tracking-[0.02em] px-4 py-1.5 rounded-[var(--radius-sm)] bg-white/10 text-white/60 hover:bg-white/15 hover:text-white transition-all duration-200">Edit</button>
          </div>
        </div>
        <HeroSection media={heroMedia} folderName={p.folderName} projectName={p.projectName} />
        <div className="max-w-[1040px] mx-auto px-[80px] pt-16 pb-12">
          <h1 className="text-[2.8rem] font-[250] tracking-[-0.03em] leading-[1.1] mb-6 text-white">{p.projectName}</h1>
          <div className="flex items-center gap-5 text-[13px] mb-6">
            <span className="font-[500] text-white/90">{p.client}</span>
            {(p.start || p.end) && <span className="text-white/40 font-[400] tabular-nums">{p.start}{p.end && p.end !== p.start ? `–${p.end}` : ''}</span>}
            {p.section && <span className="text-[10px] font-[450] tracking-[0.06em] uppercase text-white/40">{p.section}</span>}
            <span className="text-[10px] font-[400] tracking-[0.04em] text-white/25 uppercase">Tier {p.tier}</span>
          </div>
          <TagChips domains={p.domains} services={p.services} output={p.output} dark />
        </div>
      </div>

      <div className="bg-[var(--c-white)]">
        <div className="max-w-[1040px] mx-auto px-[80px] py-20">
          {p.tagline && <div className="mb-16"><TextBlock title="Tagline" content={p.tagline} large isAiGenerated={isAi('tagline')} /></div>}
          {p.description && <TextBlock title="Description" content={p.description} isAiGenerated={isAi('description')} />}
          {!p.tagline && !p.description && <TextBlock title="Tagline" content="" />}
        </div>
      </div>

      {(p.challenge || p.solution) && (
        <div className="bg-[var(--c-white)]">
          <div className="max-w-[1040px] mx-auto px-[80px] py-20">
            <div className="grid grid-cols-2 gap-16">
              <TextBlock title="Challenge" content={p.challenge} isAiGenerated={isAi('challenge')} />
              <TextBlock title="Solution" content={p.solution} isAiGenerated={isAi('solution')} />
            </div>
          </div>
        </div>
      )}

      {p.deliverables && (
        <div className="bg-[var(--c-white)]">
          <div className="max-w-[1040px] mx-auto px-[80px] py-20">
            <TextBlock title="Deliverables" content={p.deliverables} isAiGenerated={isAi('deliverables')} />
          </div>
        </div>
      )}

      {p.clientQuotes && (
        <div className="bg-[var(--c-black)]">
          <div className="max-w-[1040px] mx-auto px-[80px] py-20">
            <TextBlock title="Client Quote" content={p.clientQuotes} large dark isAiGenerated={isAi('clientQuotes')} />
          </div>
        </div>
      )}

      <div className="bg-[var(--c-white)]">
        <div className="max-w-[1040px] mx-auto px-[80px] py-20">
          {(p.urls.filter(Boolean).length > 0 || p.team.length > 0) && (
            <div className="grid grid-cols-2 gap-16 mb-16">
              <UrlLinks urls={p.urls} />
              <TeamList team={p.team} />
            </div>
          )}
          <GalleryGrid media={galleryMedia} folderName={p.folderName} />
        </div>
      </div>

      <div className="bg-[var(--c-black)] h-20" />
      <div className="fixed bottom-5 right-5 text-[10px] font-[400] tracking-[0.04em] text-white/20 bg-[var(--c-black)]/80 backdrop-blur-sm px-3 py-1.5 rounded-[var(--radius-sm)]">← → navigate</div>
    </div>
  )
}
