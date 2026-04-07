'use client'

import { useState, useRef, useCallback } from 'react'
import { api } from '@/lib/api-client'
import { toast } from '@/lib/toast'
import type { ClientMatch, ParsedEngagementRow, Client } from '@/lib/types'

interface ImportModalProps {
  open: boolean
  onClose: () => void
  onImported: () => void
}

type Step = 'upload' | 'review' | 'confirm' | 'done'

export function ImportModal({ open, onClose, onImported }: ImportModalProps) {
  const [step, setStep] = useState<Step>('upload')
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState<ParsedEngagementRow[]>([])
  const [clientMatches, setClientMatches] = useState<ClientMatch[]>([])
  const [allClients, setAllClients] = useState<Client[]>([])
  const [filename, setFilename] = useState('')
  const [result, setResult] = useState<{ inserted: number; skipped: number; clientsCreated: number } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Client mapping overrides: original name → chosen client ID or null for new
  const [overrides, setOverrides] = useState<Map<string, string | null>>(new Map())

  const handleFile = useCallback(async (file: File) => {
    setLoading(true)
    setFilename(file.name)
    try {
      const data = await api.parseEngagementImport(file)
      setRows(data.rows)
      setClientMatches(data.clientMatches)

      // Also fetch all clients for the override dropdowns
      const clients = await api.getClients()
      setAllClients(clients)

      setStep('review')
    } catch (err) {
      toast.error('Failed to parse file: ' + String(err))
    }
    setLoading(false)
  }, [])

  const handleApply = useCallback(async () => {
    setLoading(true)
    try {
      // Build client mappings from matches + overrides
      const clientMappings = clientMatches.map((m) => {
        const override = overrides.get(m.original)
        if (override !== undefined) {
          // User explicitly chose a client or "new"
          if (override === null) {
            return { original: m.original, clientId: null, newClientName: m.original }
          }
          return { original: m.original, clientId: override }
        }
        // Use auto-match
        if (m.matchedClient) {
          return { original: m.original, clientId: m.matchedClient.id }
        }
        // No match → create new
        return { original: m.original, clientId: null, newClientName: m.original }
      })

      const res = await api.applyEngagementImport({
        rows,
        clientMappings,
        filename,
      })
      setResult(res)
      setStep('done')
      onImported()
      toast.success(`Imported ${res.inserted} engagement${res.inserted !== 1 ? 's' : ''}`)
    } catch (err) {
      toast.error('Import failed: ' + String(err))
    }
    setLoading(false)
  }, [clientMatches, overrides, rows, filename, onImported])

  const handleClose = () => {
    setStep('upload')
    setRows([])
    setClientMatches([])
    setOverrides(new Map())
    setResult(null)
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-[var(--c-white)] rounded-[var(--radius-md)] shadow-xl w-[90vw] max-w-[800px] max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--c-gray-100)]">
          <h2 className="text-[16px] font-[450] text-[var(--c-gray-900)]">Import Engagements</h2>
          <button onClick={handleClose} className="text-[var(--c-gray-400)] hover:text-[var(--c-gray-700)] transition-colors">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {step === 'upload' && (
            <div className="flex flex-col items-center justify-center py-12">
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
              <div
                onClick={() => fileRef.current?.click()}
                className="w-full max-w-[400px] border-2 border-dashed border-[var(--c-gray-200)] rounded-[var(--radius-md)] p-10 text-center cursor-pointer hover:border-[var(--c-gray-400)] transition-colors"
              >
                <svg className="mx-auto mb-3 text-[var(--c-gray-300)]" width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <path d="M16 4v18M8 14l8-8 8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M4 24v2a2 2 0 002 2h20a2 2 0 002-2v-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <p className="text-[13px] text-[var(--c-gray-600)] mb-1">
                  {loading ? 'Parsing...' : 'Click to upload or drag & drop'}
                </p>
                <p className="text-[11px] text-[var(--c-gray-400)]">.xlsx, .xls, or .csv</p>
              </div>
            </div>
          )}

          {step === 'review' && (
            <div>
              <p className="text-[13px] text-[var(--c-gray-600)] mb-4">
                Found <strong>{rows.length}</strong> engagement rows with <strong>{clientMatches.length}</strong> unique clients.
              </p>

              <div className="border border-[var(--c-gray-100)] rounded-[var(--radius-sm)] overflow-hidden">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="bg-[var(--c-gray-50)] text-[var(--c-gray-500)]">
                      <th className="text-left px-3 py-2 font-[450]">Original Name</th>
                      <th className="text-left px-3 py-2 font-[450]">Match</th>
                      <th className="text-left px-3 py-2 font-[450]">Confidence</th>
                      <th className="text-left px-3 py-2 font-[450]">Override</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientMatches.map((m) => (
                      <tr key={m.original} className="border-t border-[var(--c-gray-50)]">
                        <td className="px-3 py-2 text-[var(--c-gray-800)]">{m.original}</td>
                        <td className="px-3 py-2 text-[var(--c-gray-600)]">{m.matchedClient?.name || '—'}</td>
                        <td className="px-3 py-2">
                          <span className={`text-[10px] font-[500] px-1.5 py-0.5 rounded ${
                            m.confidence === 'exact' ? 'bg-green-100 text-green-700'
                              : m.confidence === 'fuzzy' ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-red-100 text-red-700'
                          }`}>
                            {m.confidence}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={overrides.get(m.original) ?? (m.matchedClient?.id || '__new__')}
                            onChange={(e) => {
                              const val = e.target.value
                              setOverrides((prev) => {
                                const next = new Map(prev)
                                if (val === '__new__') next.set(m.original, null)
                                else if (val === (m.matchedClient?.id || '__new__')) next.delete(m.original)
                                else next.set(m.original, val)
                                return next
                              })
                            }}
                            className="text-[11px] bg-white border border-[var(--c-gray-200)] rounded-[var(--radius-sm)] px-2 py-1 cursor-pointer"
                          >
                            <option value="__new__">+ Create new</option>
                            {allClients.map((c) => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {step === 'done' && result && (
            <div className="text-center py-12">
              <svg className="mx-auto mb-4 text-green-500" width="40" height="40" viewBox="0 0 40 40" fill="none">
                <circle cx="20" cy="20" r="18" stroke="currentColor" strokeWidth="2" />
                <path d="M12 20l6 6 10-12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <h3 className="text-[16px] font-[450] text-[var(--c-gray-900)] mb-2">Import Complete</h3>
              <div className="text-[13px] text-[var(--c-gray-600)] space-y-1">
                <p>{result.inserted} engagements imported</p>
                {result.skipped > 0 && <p>{result.skipped} duplicates skipped</p>}
                {result.clientsCreated > 0 && <p>{result.clientsCreated} new clients created</p>}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[var(--c-gray-100)]">
          {step === 'review' && (
            <>
              <button onClick={() => setStep('upload')} className="text-[12px] text-[var(--c-gray-500)] hover:text-[var(--c-gray-700)] transition-colors px-3 py-1.5">
                Back
              </button>
              <button
                onClick={handleApply}
                disabled={loading}
                className="text-[12px] font-[450] px-4 py-2 rounded-[var(--radius-sm)] bg-[var(--c-gray-900)] text-white hover:bg-[var(--c-gray-800)] transition-colors disabled:opacity-50"
              >
                {loading ? 'Importing...' : `Import ${rows.length} rows`}
              </button>
            </>
          )}
          {step === 'done' && (
            <button onClick={handleClose} className="text-[12px] font-[450] px-4 py-2 rounded-[var(--radius-sm)] bg-[var(--c-gray-900)] text-white hover:bg-[var(--c-gray-800)] transition-colors">
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
