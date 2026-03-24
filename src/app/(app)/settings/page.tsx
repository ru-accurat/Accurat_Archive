'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useProjectStore } from '@/stores/project-store'
import { api } from '@/lib/api-client'
import { CsvImportModal } from '@/components/import/CsvImportModal'

export default function SettingsPage() {
  const router = useRouter()
  const { setProjects } = useProjectStore()
  const [apiKey, setApiKey] = useState('')
  const [googleKey, setGoogleKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [showGoogleKey, setShowGoogleKey] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  const [importModalOpen, setImportModalOpen] = useState(false)
  const [importData, setImportData] = useState<{
    headers: string[]
    rows: Record<string, string>[]
    matches: { rowIndex: number; projectId: string; projectFullName: string; matchType: string }[]
    totalProjects: number
  } | null>(null)
  const [importParsing, setImportParsing] = useState(false)
  const csvInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    api.getConfig().then((config) => {
      if (config.anthropicApiKey) setApiKey(config.anthropicApiKey as string)
      if (config.googleApiKey) setGoogleKey(config.googleApiKey as string)
      setLoading(false)
    })
  }, [])

  const handleSave = async () => {
    setSaving(true)
    await api.setConfig({ anthropicApiKey: apiKey.trim(), googleApiKey: googleKey.trim() })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleImportCsv = () => { csvInputRef.current?.click() }

  const handleCsvFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportParsing(true)
    try {
      const res = await api.parseCsvForImport(file) as {
        headers: string[]; rows: Record<string, string>[]; rowCount: number;
        matches?: { rowIndex: number; projectId: string; projectFullName: string; matchType: string }[];
        totalProjects?: number;
      }
      setImportData({
        headers: res.headers,
        rows: res.rows,
        matches: res.matches || [],
        totalProjects: res.totalProjects || res.rowCount,
      })
      setImportModalOpen(true)
    } catch (err) {
      console.error('Import error:', err)
    }
    setImportParsing(false)
    if (csvInputRef.current) csvInputRef.current.value = ''
  }

  const handleImported = async () => {
    const projects = await api.getProjects()
    setProjects(projects)
  }

  if (loading) {
    return <div className="flex items-center justify-center h-full bg-[var(--c-white)] text-[var(--c-gray-400)] text-[13px]">Loading...</div>
  }

  return (
    <div className="h-full overflow-y-auto bg-[var(--c-white)]">
      <input ref={csvInputRef} type="file" accept=".csv" className="hidden" onChange={handleCsvFile} />
      <div className="max-w-[720px] mx-auto px-4 sm:px-6 md:px-[48px] py-10">
        <h1 className="text-[1.4rem] font-[300] tracking-[-0.02em] text-[var(--c-gray-900)] mb-8">Settings</h1>

        <div className="mb-10">
          <label className="text-[10px] font-[500] uppercase tracking-[0.1em] text-[var(--c-gray-400)] block mb-3">Data Import</label>
          <p className="text-[12px] font-[400] text-[var(--c-gray-500)] mb-4 leading-[1.6]">
            Import projects from a CSV file. This will create or update projects based on the data.
          </p>
          <button onClick={handleImportCsv} disabled={importParsing} className="text-[12px] font-[500] px-5 py-2 rounded-[var(--radius-sm)] border border-[var(--c-gray-200)] text-[var(--c-gray-700)] hover:bg-[var(--c-gray-50)] transition-colors duration-200 disabled:opacity-40">
            {importParsing ? 'Reading CSV...' : 'Import CSV'}
          </button>
        </div>

        <div className="border-t border-[var(--c-gray-100)] mb-10" />

        <div className="mb-10">
          <label className="text-[10px] font-[500] uppercase tracking-[0.1em] text-[var(--c-gray-400)] block mb-3">AI Writing Guidelines</label>
          <p className="text-[12px] font-[400] text-[var(--c-gray-500)] mb-4 leading-[1.6]">
            Edit the voice, tone, and style guidelines the AI uses when writing case studies.
          </p>
          <button onClick={() => router.push('/settings/ai')} className="text-[12px] font-[500] px-5 py-2 rounded-[var(--radius-sm)] border border-[var(--c-gray-200)] text-[var(--c-gray-700)] hover:bg-[var(--c-gray-50)] transition-colors duration-200">
            Edit AI Guidelines
          </button>
        </div>

        <div className="border-t border-[var(--c-gray-100)] mb-10" />

        <div className="mb-8">
          <label className="text-[10px] font-[500] uppercase tracking-[0.1em] text-[var(--c-gray-400)] block mb-3">Anthropic API Key</label>
          <p className="text-[12px] font-[400] text-[var(--c-gray-500)] mb-4 leading-[1.6]">
            Required for AI content generation. Get your key from{' '}
            <span className="text-[var(--c-gray-700)] font-[450]">console.anthropic.com</span>
          </p>
          <div className="flex items-center gap-3">
            <input
              type={showKey ? 'text' : 'password'} value={apiKey} onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-ant-..."
              className="flex-1 px-0 py-2 text-[14px] font-[350] bg-transparent border-b border-[var(--c-gray-200)] focus:border-[var(--c-gray-900)] focus:outline-none transition-colors duration-200 text-[var(--c-gray-800)] placeholder:text-[var(--c-gray-300)] font-mono"
            />
            <button onClick={() => setShowKey(!showKey)} className="text-[11px] font-[400] text-[var(--c-gray-400)] hover:text-[var(--c-gray-700)] transition-colors duration-200">
              {showKey ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        <div className="mb-8">
          <label className="text-[10px] font-[500] uppercase tracking-[0.1em] text-[var(--c-gray-400)] block mb-3">Google AI Studio API Key</label>
          <p className="text-[12px] font-[400] text-[var(--c-gray-500)] mb-4 leading-[1.6]">
            Required for in-use image generation (Gemini). Get your key from{' '}
            <span className="text-[var(--c-gray-700)] font-[450]">aistudio.google.com/apikey</span>
          </p>
          <div className="flex items-center gap-3">
            <input
              type={showGoogleKey ? 'text' : 'password'} value={googleKey} onChange={(e) => setGoogleKey(e.target.value)}
              placeholder="AIza..."
              className="flex-1 px-0 py-2 text-[14px] font-[350] bg-transparent border-b border-[var(--c-gray-200)] focus:border-[var(--c-gray-900)] focus:outline-none transition-colors duration-200 text-[var(--c-gray-800)] placeholder:text-[var(--c-gray-300)] font-mono"
            />
            <button onClick={() => setShowGoogleKey(!showGoogleKey)} className="text-[11px] font-[400] text-[var(--c-gray-400)] hover:text-[var(--c-gray-700)] transition-colors duration-200">
              {showGoogleKey ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button onClick={handleSave} disabled={saving} className="text-[12px] font-[500] px-6 py-2 rounded-[var(--radius-sm)] bg-[var(--c-gray-900)] text-white hover:bg-[var(--c-gray-800)] transition-colors duration-200 disabled:opacity-40">
            {saving ? 'Saving...' : 'Save'}
          </button>
          {saved && <span className="text-[12px] font-[400] text-[var(--c-success)]">Saved!</span>}
        </div>
      </div>

      <CsvImportModal
        open={importModalOpen}
        onClose={() => { setImportModalOpen(false); setImportData(null) }}
        onImported={handleImported}
        data={importData}
      />
    </div>
  )
}
