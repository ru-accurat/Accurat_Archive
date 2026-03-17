'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useProjectStore } from '@/stores/project-store'
import { api } from '@/lib/api-client'

type TagType = 'domains' | 'services' | 'output'

interface TagInfo {
  name: string
  count: number
}

export default function TagsPage() {
  const router = useRouter()
  const { projects } = useProjectStore()
  const [activeTab, setActiveTab] = useState<TagType>('domains')
  const [editingTag, setEditingTag] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState(false)

  const tags = useMemo(() => {
    const counts = new Map<string, number>()
    for (const project of projects) {
      if (activeTab === 'output') {
        if (project.output) counts.set(project.output, (counts.get(project.output) || 0) + 1)
      } else {
        const arr = project[activeTab] as string[]
        for (const tag of arr) counts.set(tag, (counts.get(tag) || 0) + 1)
      }
    }
    return Array.from(counts.entries())
      .map(([name, count]): TagInfo => ({ name, count }))
      .sort((a, b) => b.count - a.count)
  }, [projects, activeTab])

  const handleRename = async (oldName: string) => {
    if (!editValue.trim() || editValue.trim() === oldName) { setEditingTag(null); return }
    setSaving(true)
    try {
      await api.renameTag(activeTab, oldName, editValue.trim())
      const updated = await api.getProjects()
      useProjectStore.getState().setProjects(updated)
    } catch (err) { alert(String(err)) }
    setSaving(false)
    setEditingTag(null)
  }

  const handleMerge = async (source: string) => {
    const target = prompt(`Merge "${source}" into which tag?`)
    if (!target || target === source) return
    setSaving(true)
    try {
      const result = await api.mergeTags(activeTab, source, target) as { success: boolean; updated: number }
      if (result.success) {
        const updated = await api.getProjects()
        useProjectStore.getState().setProjects(updated)
        alert(`Merged into "${target}" — ${result.updated} projects updated`)
      }
    } catch (err) { alert(String(err)) }
    setSaving(false)
  }

  const tabs: { key: TagType; label: string }[] = [
    { key: 'domains', label: 'Domains' },
    { key: 'services', label: 'Services' },
    { key: 'output', label: 'Category' },
  ]

  return (
    <div className="h-full overflow-y-auto bg-[var(--c-white)]">
      <div className="max-w-[800px] mx-auto" style={{ padding: '48px 80px' }}>
        <button onClick={() => router.push('/')} className="text-[12px] font-[400] text-[var(--c-gray-400)] hover:text-[var(--c-gray-900)] transition-colors duration-200 mb-10 block">&larr; Back</button>
        <h1 className="text-[2rem] font-[250] tracking-[-0.03em] text-[var(--c-gray-900)] mb-8">Tags Management</h1>

        <div className="flex gap-1 mb-8 border-b border-[var(--c-gray-200)]">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setEditingTag(null) }}
              className={`text-[12px] font-[450] px-4 py-2.5 transition-colors duration-200 border-b-2 -mb-[1px] ${
                activeTab === tab.key ? 'border-[var(--c-gray-900)] text-[var(--c-gray-900)]' : 'border-transparent text-[var(--c-gray-400)] hover:text-[var(--c-gray-700)]'
              }`}
            >
              {tab.label}
              <span className="ml-2 text-[10px] text-[var(--c-gray-400)]">{activeTab === tab.key ? tags.length : ''}</span>
            </button>
          ))}
        </div>

        <div className="flex flex-col">
          {tags.map((tag) => (
            <div key={tag.name} className="flex items-center gap-4 py-3 border-b border-[var(--c-gray-100)] group">
              {editingTag === tag.name ? (
                <input
                  type="text" value={editValue} onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleRename(tag.name); if (e.key === 'Escape') setEditingTag(null) }}
                  onBlur={() => handleRename(tag.name)} autoFocus
                  className="flex-1 px-2 py-1 text-[13px] font-[400] bg-transparent border-b border-[var(--c-gray-900)] focus:outline-none text-[var(--c-gray-900)]"
                />
              ) : (
                <span className="flex-1 text-[13px] font-[400] text-[var(--c-gray-800)]">{tag.name}</span>
              )}
              <span className="text-[11px] font-[400] text-[var(--c-gray-400)] tabular-nums w-16 text-right">{tag.count} project{tag.count !== 1 ? 's' : ''}</span>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <button onClick={() => { setEditingTag(tag.name); setEditValue(tag.name) }} disabled={saving} className="text-[10px] font-[400] text-[var(--c-gray-400)] hover:text-[var(--c-gray-900)] transition-colors duration-200">Rename</button>
                <button onClick={() => handleMerge(tag.name)} disabled={saving} className="text-[10px] font-[400] text-[var(--c-gray-400)] hover:text-[var(--c-gray-900)] transition-colors duration-200">Merge</button>
              </div>
            </div>
          ))}
          {tags.length === 0 && <div className="text-[13px] font-[350] text-[var(--c-gray-400)] py-8 text-center">No tags found</div>}
        </div>
      </div>
    </div>
  )
}
