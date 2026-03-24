'use client'

import { useEffect, useState, useCallback } from 'react'
import { api } from '@/lib/api-client'
import { Breadcrumb } from '@/components/shared/Breadcrumb'

const TABS = [
  { key: 'guidelines', label: 'Writing Guidelines', description: 'Core rules for case study structure, tone, and vocabulary.' },
  { key: 'voice', label: 'Voice & Tone', description: 'Accurat\'s writing style: directness, confidence, specificity.' },
  { key: 'company', label: 'Company Background', description: 'Accurat\'s positioning, team structure, and capabilities.' },
  { key: 'market', label: 'Market Positioning', description: 'Core intellectual positions: Data-Native, Data Humanism, etc.' },
  { key: 'projects', label: 'Key Projects', description: 'Reference projects, Tier 1 clients, and landmark work.' },
  { key: 'inuse_prompt', label: 'In-Use Photography', description: 'Photography style, device types, framing, and context rules for generating in-use mockup images.' },
]

export default function AiSettingsPage() {
  const [settings, setSettings] = useState<Record<string, { value: string; updatedAt: string }>>({})
  const [activeTab, setActiveTab] = useState('guidelines')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState<Set<string>>(new Set())
  const [drafts, setDrafts] = useState<Record<string, string>>({})

  const loadSettings = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.getAiSettings()
      setSettings(data)
      const d: Record<string, string> = {}
      for (const [key, val] of Object.entries(data)) {
        d[key] = val.value
      }
      setDrafts(d)
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  useEffect(() => { loadSettings() }, [loadSettings])

  const handleChange = (key: string, value: string) => {
    setDrafts(prev => ({ ...prev, [key]: value }))
    setDirty(prev => new Set(prev).add(key))
  }

  const handleSave = async () => {
    if (dirty.size === 0) return
    setSaving(true)
    try {
      const updates: Record<string, string> = {}
      for (const key of dirty) {
        updates[key] = drafts[key] || ''
      }
      await api.updateAiSettings(updates)
      setDirty(new Set())
      await loadSettings()
    } catch (err) {
      alert('Save failed: ' + String(err))
    }
    setSaving(false)
  }

  const handleSaveAll = async () => {
    setSaving(true)
    try {
      const updates: Record<string, string> = {}
      for (const tab of TABS) {
        updates[tab.key] = drafts[tab.key] || ''
      }
      await api.updateAiSettings(updates)
      setDirty(new Set())
      await loadSettings()
    } catch (err) {
      alert('Save failed: ' + String(err))
    }
    setSaving(false)
  }

  const activeTabInfo = TABS.find(t => t.key === activeTab)
  const currentValue = drafts[activeTab] || ''
  const isDirty = dirty.has(activeTab)
  const updatedAt = settings[activeTab]?.updatedAt

  if (loading) {
    return <div className="flex items-center justify-center h-full bg-[var(--c-white)] text-[var(--c-gray-400)] text-[13px]">Loading...</div>
  }

  return (
    <div className="h-full overflow-y-auto bg-[var(--c-white)]">
      <div className="max-w-[1000px] px-4 sm:px-6 md:px-[48px] py-10">
        <div className="mb-4">
          <Breadcrumb items={[
            { label: 'Settings', href: '/settings' },
            { label: 'AI Writing Guidelines' },
          ]} />
        </div>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-[1.4rem] font-[300] tracking-[-0.02em] text-[var(--c-gray-900)]">AI Writing Guidelines</h1>
            <p className="text-[12px] text-[var(--c-gray-400)] mt-1">
              These documents are used as context when the AI writes or refines case studies.
            </p>
          </div>
          <div className="flex gap-2">
            {dirty.size > 0 && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="text-[11px] font-[450] px-4 py-2 rounded-[var(--radius-sm)] bg-[var(--c-gray-900)] text-white hover:bg-[var(--c-gray-800)] transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : `Save ${dirty.size} change${dirty.size !== 1 ? 's' : ''}`}
              </button>
            )}
            <button
              onClick={handleSaveAll}
              disabled={saving}
              className="text-[11px] font-[450] px-4 py-2 rounded-[var(--radius-sm)] border border-[var(--c-gray-200)] text-[var(--c-gray-600)] hover:bg-[var(--c-gray-50)] transition-colors disabled:opacity-50"
            >
              Save All
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-[var(--c-gray-100)]">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`text-[11px] font-[450] px-4 py-2.5 border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-[var(--c-gray-900)] text-[var(--c-gray-900)]'
                  : 'border-transparent text-[var(--c-gray-400)] hover:text-[var(--c-gray-600)]'
              }`}
            >
              {tab.label}
              {dirty.has(tab.key) && <span className="ml-1.5 w-1.5 h-1.5 inline-block rounded-full bg-[var(--c-ai)]" />}
            </button>
          ))}
        </div>

        {/* Editor */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[12px] text-[var(--c-gray-500)]">{activeTabInfo?.description}</p>
            <div className="flex items-center gap-3">
              {isDirty && <span className="text-[10px] text-[var(--c-ai)] font-[450]">Unsaved</span>}
              {updatedAt && (
                <span className="text-[10px] text-[var(--c-gray-400)]">
                  Last saved: {new Date(updatedAt).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
          <textarea
            value={currentValue}
            onChange={(e) => handleChange(activeTab, e.target.value)}
            placeholder={`Paste or write the ${activeTabInfo?.label?.toLowerCase()} content here...`}
            className="w-full h-[60vh] text-[13px] font-mono leading-relaxed px-4 py-3 bg-[var(--c-gray-50)] border border-[var(--c-gray-200)] rounded-[var(--radius-sm)] focus:outline-none focus:border-[var(--c-gray-400)] resize-none"
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-[10px] text-[var(--c-gray-400)]">
              {currentValue.length.toLocaleString()} characters · Markdown supported
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
