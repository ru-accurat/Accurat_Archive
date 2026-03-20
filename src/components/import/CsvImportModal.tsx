'use client'

import { useState, useMemo } from 'react'
import { api } from '@/lib/api-client'

// Known CSV header -> Project field auto-mapping
const AUTO_MAP: Record<string, string> = {
  'Full Name': 'fullName',
  'Client': 'client',
  'Project Name': 'projectName',
  'Tier': 'tier',
  'Unit': 'section',
  'Section': 'section',
  'Start': 'start',
  'End': 'end',
  'Domains and Sectors': 'domains',
  'Services': 'services',
  'Tagline': 'tagline',
  'Description': 'description',
  'Challenge': 'challenge',
  'Solution': 'solution',
  'Deliverables': 'deliverables',
  'Client Quotes': 'clientQuotes',
  'Accurat Team': 'team',
  'URL 1': 'urls',
  'URL 2': 'urls',
  'URL 3': 'urls',
  'Output': 'output',
  'Status': 'status',
  'Location': 'locationName',
  'Latitude': 'latitude',
  'Longitude': 'longitude',
  'Folder Name': 'folderName',
  'Hero Image': 'heroImage',
  'Thumb Image': 'thumbImage',
  'Client Logo': 'clientLogo',
  'PDF Files': 'pdfFiles',
  'Media Order': 'mediaOrder',
  'AI Generated': 'aiGenerated',
}

const TARGET_FIELDS = [
  { value: '', label: '— Skip —' },
  { value: 'fullName', label: 'Full Name' },
  { value: 'client', label: 'Client' },
  { value: 'projectName', label: 'Project Name' },
  { value: 'tier', label: 'Tier' },
  { value: 'section', label: 'Unit' },
  { value: 'start', label: 'Start Year' },
  { value: 'end', label: 'End Year' },
  { value: 'domains', label: 'Domains' },
  { value: 'services', label: 'Services' },
  { value: 'tagline', label: 'Tagline' },
  { value: 'description', label: 'Description' },
  { value: 'challenge', label: 'Challenge' },
  { value: 'solution', label: 'Solution' },
  { value: 'deliverables', label: 'Deliverables' },
  { value: 'clientQuotes', label: 'Client Quotes' },
  { value: 'team', label: 'Team' },
  { value: 'urls', label: 'URLs' },
  { value: 'output', label: 'Category / Output' },
  { value: 'status', label: 'Status' },
  { value: 'locationName', label: 'Location Name' },
  { value: 'latitude', label: 'Latitude' },
  { value: 'longitude', label: 'Longitude' },
  { value: 'folderName', label: 'Folder Name' },
  { value: 'heroImage', label: 'Hero Image' },
  { value: 'thumbImage', label: 'Thumb Image' },
  { value: 'clientLogo', label: 'Client Logo' },
  { value: 'pdfFiles', label: 'PDF Files' },
  { value: 'mediaOrder', label: 'Media Order' },
  { value: 'aiGenerated', label: 'AI Generated' },
]

interface MatchInfo {
  rowIndex: number
  projectId: string
  projectFullName: string
  matchType: string
}

interface Props {
  open: boolean
  onClose: () => void
  onImported: () => void
  data: {
    headers: string[]
    rows: Record<string, string>[]
    matches: MatchInfo[]
    totalProjects: number
  } | null
}

export function CsvImportModal({ open, onClose, onImported, data }: Props) {
  // Column mapping: CSV header -> target field
  const [columnMap, setColumnMap] = useState<Record<string, string>>({})
  // Which CSV columns are enabled
  const [enabled, setEnabled] = useState<Record<string, boolean>>({})
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  // Initialize mapping from auto-map when data changes
  useMemo(() => {
    if (!data) return
    const map: Record<string, string> = {}
    const en: Record<string, boolean> = {}
    for (const h of data.headers) {
      const autoField = AUTO_MAP[h]
      map[h] = autoField || ''
      en[h] = !!autoField
    }
    setColumnMap(map)
    setEnabled(en)
    setResult(null)
  }, [data])

  if (!open || !data) return null

  const matchedCount = data.matches.length
  const unmatchedCount = data.rows.length - matchedCount
  const selectedColumns = data.headers.filter((h) => enabled[h] && columnMap[h])

  const handleToggle = (header: string) => {
    setEnabled((prev) => ({ ...prev, [header]: !prev[header] }))
  }

  const handleMapChange = (header: string, field: string) => {
    setColumnMap((prev) => ({ ...prev, [header]: field }))
    if (field) {
      setEnabled((prev) => ({ ...prev, [header]: true }))
    }
  }

  const handleImport = async () => {
    setImporting(true)
    setResult(null)
    try {
      const res = await api.applyCsvImport({
        rows: data.rows,
        matches: data.matches.map((m) => ({ rowIndex: m.rowIndex, projectId: m.projectId })),
        columnMap,
        selectedColumns
      }) as { success: boolean; updated: number; message?: string }
      if (res.success) {
        setResult({ success: true, message: `Updated ${res.updated} project${res.updated !== 1 ? 's' : ''}.` })
        onImported()
      } else {
        setResult({ success: false, message: res.message || 'Import failed.' })
      }
    } catch (err) {
      setResult({ success: false, message: String(err) })
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-[var(--c-white)] rounded-[var(--radius-lg)] w-[90%] max-w-[700px] max-h-[85vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-7 py-5 border-b border-[var(--c-gray-100)]">
          <div>
            <h2 className="text-[1.1rem] font-[400] tracking-[-0.01em] text-[var(--c-gray-900)]">
              Import CSV
            </h2>
            <p className="text-[12px] font-[400] text-[var(--c-gray-400)] mt-1">
              {data.rows.length} rows &middot;{' '}
              <span className={matchedCount > 0 ? 'text-[var(--c-success)]' : 'text-[var(--c-gray-400)]'}>
                {matchedCount} matched
              </span>
              {unmatchedCount > 0 && (
                <span className="text-[var(--c-warning)]"> &middot; {unmatchedCount} unmatched</span>
              )}
              {' '}&middot; {data.totalProjects} projects in database
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--c-gray-400)] hover:text-[var(--c-gray-900)] transition-colors duration-150 p-1"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Column Mapping Table */}
        <div className="flex-1 overflow-y-auto px-7 py-5">
          <div className="text-[10px] font-[500] uppercase tracking-[0.1em] text-[var(--c-gray-400)] mb-3">
            Column Mapping
          </div>

          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-left text-[10px] font-[500] uppercase tracking-[0.08em] text-[var(--c-gray-400)]">
                <th className="pb-2 w-[36px]"></th>
                <th className="pb-2">CSV Column</th>
                <th className="pb-2 w-[24px]"></th>
                <th className="pb-2">Maps To</th>
                <th className="pb-2 text-right">Preview</th>
              </tr>
            </thead>
            <tbody>
              {data.headers.map((header) => {
                const isEnabled = enabled[header] ?? false
                const targetField = columnMap[header] || ''
                // Show first non-empty value as preview
                const preview = data.rows.find((r) => r[header]?.trim())?.[header]?.trim() || ''
                return (
                  <tr
                    key={header}
                    className={`border-t border-[var(--c-gray-50)] transition-opacity duration-150 ${isEnabled ? '' : 'opacity-40'}`}
                  >
                    <td className="py-2.5">
                      <input
                        type="checkbox"
                        checked={isEnabled}
                        onChange={() => handleToggle(header)}
                        className="w-3.5 h-3.5 rounded-[2px] border-[var(--c-gray-300)] text-[var(--c-gray-900)] focus:ring-[var(--c-gray-400)] focus:ring-1 cursor-pointer"
                      />
                    </td>
                    <td className="py-2.5 font-[450] text-[var(--c-gray-700)]">
                      {header}
                    </td>
                    <td className="py-2.5 text-center text-[var(--c-gray-300)]">&rarr;</td>
                    <td className="py-2.5">
                      <select
                        value={targetField}
                        onChange={(e) => handleMapChange(header, e.target.value)}
                        className="w-full bg-transparent border-b border-[var(--c-gray-200)] focus:border-[var(--c-gray-900)] focus:outline-none text-[13px] font-[400] text-[var(--c-gray-700)] py-0.5 px-0 appearance-none cursor-pointer"
                      >
                        {TARGET_FIELDS.map((f) => (
                          <option key={`${header}-${f.value}`} value={f.value}>
                            {f.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2.5 text-right text-[11px] text-[var(--c-gray-400)] font-[350] max-w-[160px] truncate">
                      {preview.length > 40 ? preview.slice(0, 40) + '...' : preview}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {unmatchedCount > 0 && (
            <div className="mt-5 text-[11px] text-[var(--c-gray-400)] bg-[var(--c-gray-50)] rounded-[var(--radius-sm)] px-4 py-3">
              <span className="font-[500] text-[var(--c-warning)]">{unmatchedCount} unmatched row{unmatchedCount !== 1 ? 's' : ''}</span>{' '}
              will be skipped. Matching uses Full Name, Client + Project Name, or fuzzy name comparison.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-7 py-4 border-t border-[var(--c-gray-100)]">
          <div>
            {result && (
              <span className={`text-[12px] font-[400] ${result.success ? 'text-[var(--c-success)]' : 'text-[var(--c-error)]'}`}>
                {result.message}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="text-[12px] font-[400] text-[var(--c-gray-500)] hover:text-[var(--c-gray-900)] transition-colors duration-150 px-4 py-2"
            >
              {result?.success ? 'Close' : 'Cancel'}
            </button>
            {!result?.success && (
              <button
                onClick={handleImport}
                disabled={importing || selectedColumns.length === 0 || matchedCount === 0}
                className="text-[12px] font-[500] px-6 py-2 rounded-[var(--radius-sm)] bg-[var(--c-gray-900)] text-white hover:bg-[var(--c-gray-800)] transition-colors duration-200 disabled:opacity-30"
              >
                {importing
                  ? 'Importing...'
                  : `Import ${selectedColumns.length} column${selectedColumns.length !== 1 ? 's' : ''} into ${matchedCount} project${matchedCount !== 1 ? 's' : ''}`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
