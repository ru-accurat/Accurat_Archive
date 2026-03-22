import type { Project, HistoryEntry, MediaFile, Engagement, Client, ImportBatch, ClientMatch, ParsedEngagementRow } from './types'

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`API error ${res.status}: ${text}`)
  }
  return res.json()
}

export const api = {
  // Projects
  getProjects: (): Promise<Project[]> =>
    fetch('/api/projects').then(r => json(r)),

  getProject: (id: string): Promise<Project> =>
    fetch(`/api/projects/${id}`).then(r => json(r)),

  updateProject: (id: string, data: Record<string, unknown>): Promise<Project> =>
    fetch(`/api/projects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(r => json(r)),

  createProject: (client: string, projectName: string): Promise<Project> =>
    fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client, projectName })
    }).then(r => json(r)),

  deleteProject: (id: string): Promise<{ success: boolean }> =>
    fetch(`/api/projects/${id}`, { method: 'DELETE' }).then(r => json(r)),

  // Media
  getProjectMedia: (id: string): Promise<MediaFile[]> =>
    fetch(`/api/projects/${id}/media`).then(r => json(r)),

  getSpecialMedia: (folderName: string): Promise<{ header: string | null; thumb: string | null }> =>
    fetch(`/api/projects/media/special?folder=${encodeURIComponent(folderName)}`).then(r => json(r)),

  getAllSpecialMedia: (): Promise<Record<string, { header: string | null; thumb: string | null; first: string | null }>> =>
    fetch('/api/projects/media/special').then(r => json(r)),

  addMedia: async (projectId: string, files: FileList): Promise<{ success: boolean; uploaded?: number }> => {
    // Get signed upload URLs from API
    const fileMeta = Array.from(files).map(f => ({ name: f.name, size: f.size, type: f.type }))
    const { urls } = await fetch(`/api/projects/${projectId}/media/upload-urls`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ files: fileMeta })
    }).then(r => json<{ urls: { name: string; url: string; path: string }[] }>(r))

    // Upload each file directly to Supabase Storage
    let uploaded = 0
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const urlInfo = urls.find(u => u.name === file.name)
      if (!urlInfo) continue

      const res = await fetch(urlInfo.url, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        body: file,
      })
      if (res.ok) uploaded++
    }

    // Finalize: update media_order in DB
    if (uploaded > 0) {
      await fetch(`/api/projects/${projectId}/media/finalize`, { method: 'POST' })
    }

    return { success: uploaded > 0, uploaded }
  },

  deleteMedia: (projectId: string, filename: string): Promise<{ success: boolean }> =>
    fetch(`/api/projects/${projectId}/media/${encodeURIComponent(filename)}`, { method: 'DELETE' }).then(r => json(r)),

  batchDeleteMedia: (projectId: string, filenames: string[]): Promise<{ success: boolean; deleted: number }> =>
    fetch(`/api/projects/${projectId}/media/batch-delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filenames })
    }).then(r => json(r)),

  reorderMedia: (projectId: string, mediaOrder: string[]): Promise<{ success: boolean }> =>
    fetch(`/api/projects/${projectId}/media/reorder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mediaOrder })
    }).then(r => json(r)),

  uploadLogo: async (projectId: string, file: File): Promise<{ success: boolean; filename: string }> => {
    const fd = new FormData()
    fd.append('file', file)
    return fetch(`/api/projects/${projectId}/logo`, { method: 'POST', body: fd }).then(r => json(r))
  },

  deleteLogo: (projectId: string): Promise<{ success: boolean }> =>
    fetch(`/api/projects/${projectId}/logo`, { method: 'DELETE' }).then(r => json(r)),

  // PDFs
  addPdfs: async (projectId: string, files: FileList): Promise<{ success: boolean; count?: number }> => {
    const fileMeta = Array.from(files).map(f => ({ name: f.name, size: f.size, type: f.type }))
    const { urls } = await fetch(`/api/projects/${projectId}/pdfs/upload-urls`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ files: fileMeta })
    }).then(r => json<{ urls: { name: string; url: string; path: string }[] }>(r))

    let uploaded = 0
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const urlInfo = urls.find(u => u.name === file.name)
      if (!urlInfo) continue
      const res = await fetch(urlInfo.url, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'application/pdf' },
        body: file,
      })
      if (res.ok) uploaded++
    }

    if (uploaded > 0) {
      await fetch(`/api/projects/${projectId}/pdfs/finalize`, { method: 'POST' })
    }

    return { success: uploaded > 0, count: uploaded }
  },

  batchDeletePdfs: (projectId: string, filenames: string[]): Promise<{ success: boolean; deleted: number }> =>
    fetch(`/api/projects/${projectId}/pdfs/batch-delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filenames })
    }).then(r => json(r)),

  renamePdf: (projectId: string, oldName: string, newName: string): Promise<{ success: boolean; filename: string }> =>
    fetch(`/api/projects/${projectId}/pdfs/rename`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldName, newName })
    }).then(r => json(r)),

  // History
  getProjectHistory: (id: string): Promise<HistoryEntry[]> =>
    fetch(`/api/projects/${id}/history`).then(r => json(r)),

  getProjectSnapshot: (id: string, timestamp: string): Promise<Project | null> =>
    fetch(`/api/projects/${id}/snapshot?timestamp=${encodeURIComponent(timestamp)}`).then(r => json(r)),

  // CSV
  parseCsvForImport: async (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return fetch('/api/csv/parse', { method: 'POST', body: fd }).then(r => json(r))
  },

  applyCsvImport: (payload: Record<string, unknown>) =>
    fetch('/api/csv/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(r => json(r)),

  // Config
  getConfig: (): Promise<Record<string, unknown>> =>
    fetch('/api/config').then(r => json(r)),

  setConfig: (config: Record<string, unknown>): Promise<Record<string, unknown>> =>
    fetch('/api/config', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    }).then(r => json(r)),

  // AI
  generateField: (projectId: string, fieldName: string): Promise<{ success: boolean; text: string; message?: string }> =>
    fetch('/api/ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, fieldName })
    }).then(r => json(r)),

  // Export
  exportCsv: (projectIds: string[]): Promise<Blob> =>
    fetch('/api/csv/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectIds })
    }).then(r => r.blob()),

  exportZip: (projectIds: string[]): Promise<Blob> =>
    fetch('/api/zip/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectIds })
    }).then(r => r.blob()),

  // Tags
  getAllTags: (): Promise<{ domains: string[]; services: string[]; outputs: string[] }> =>
    fetch('/api/tags').then(r => json(r)),

  renameTag: (type: string, oldValue: string, newValue: string) =>
    fetch('/api/tags/rename', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, oldValue, newValue })
    }).then(r => json(r)),

  mergeTags: (type: string, source: string, target: string) =>
    fetch('/api/tags/merge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, source, target })
    }).then(r => json(r)),

  // Engagements
  getEngagements: (params?: { year?: number; clientId?: string; linked?: boolean }): Promise<Engagement[]> => {
    const sp = new URLSearchParams()
    if (params?.year) sp.set('year', String(params.year))
    if (params?.clientId) sp.set('clientId', params.clientId)
    if (params?.linked !== undefined) sp.set('linked', String(params.linked))
    return fetch(`/api/engagements?${sp}`).then(r => json(r))
  },

  updateEngagement: (id: string, data: Record<string, unknown>): Promise<{ success: boolean }> =>
    fetch(`/api/engagements/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(r => json(r)),

  deleteEngagement: (id: string): Promise<{ success: boolean }> =>
    fetch(`/api/engagements/${id}`, { method: 'DELETE' }).then(r => json(r)),

  linkEngagementProjects: (id: string, projectIds: string[]): Promise<{ success: boolean }> =>
    fetch(`/api/engagements/${id}/link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectIds })
    }).then(r => json(r)),

  unlinkEngagementProjects: (id: string, projectIds: string[]): Promise<{ success: boolean }> =>
    fetch(`/api/engagements/${id}/link`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectIds })
    }).then(r => json(r)),

  // Clients
  getClients: (): Promise<Client[]> =>
    fetch('/api/clients').then(r => json(r)),

  getClient: (id: string): Promise<Client & { revenueByYear: Record<number, number>; engagements: Engagement[]; projects: Project[] }> =>
    fetch(`/api/clients/${id}`).then(r => json(r)),

  updateClient: (id: string, data: Record<string, unknown>): Promise<{ success: boolean }> =>
    fetch(`/api/clients/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(r => json(r)),

  mergeClients: (sourceId: string, targetId: string): Promise<{ success: boolean; movedEngagements: number; movedProjects: number; targetName: string }> =>
    fetch('/api/clients/merge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceId, targetId })
    }).then(r => json(r)),

  // Project ↔ Engagement linking (from project side)
  getProjectEngagements: (projectId: string): Promise<Engagement[]> =>
    fetch(`/api/projects/${projectId}/engagements`).then(r => json(r)),

  linkProjectEngagements: (projectId: string, engagementIds: string[]): Promise<{ success: boolean }> =>
    fetch(`/api/projects/${projectId}/engagements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ engagementIds })
    }).then(r => json(r)),

  unlinkProjectEngagement: (projectId: string, engagementId: string): Promise<{ success: boolean }> =>
    fetch(`/api/projects/${projectId}/engagements`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ engagementId })
    }).then(r => json(r)),

  // Engagement Import
  parseEngagementImport: async (file: File): Promise<{
    rows: ParsedEngagementRow[]
    clientMatches: ClientMatch[]
    autoLinks: { rowIndex: number; suggestedProjectIds: string[] }[]
    totalParsed: number
    validRows: number
  }> => {
    const fd = new FormData()
    fd.append('file', file)
    return fetch('/api/engagements/import/parse', { method: 'POST', body: fd }).then(r => json(r))
  },

  applyEngagementImport: (payload: Record<string, unknown>): Promise<{
    inserted: number
    skipped: number
    clientsCreated: number
    linksCreated: number
    batchId: string
  }> =>
    fetch('/api/engagements/import/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(r => json(r)),

  getImportBatches: (): Promise<ImportBatch[]> =>
    fetch('/api/engagements/import/batches').then(r => json(r)),

  deleteImportBatch: (batchId: string): Promise<{ deleted: number }> =>
    fetch(`/api/engagements/import/${batchId}`, { method: 'DELETE' }).then(r => json(r)),
}
