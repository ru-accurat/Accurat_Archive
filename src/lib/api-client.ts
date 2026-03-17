import type { Project, HistoryEntry, MediaFile } from './types'

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

  addMedia: async (projectId: string, files: FileList): Promise<{ success: boolean }> => {
    const fd = new FormData()
    for (let i = 0; i < files.length; i++) fd.append('files', files[i])
    return fetch(`/api/projects/${projectId}/media`, { method: 'POST', body: fd }).then(r => json(r))
  },

  deleteMedia: (projectId: string, filename: string): Promise<{ success: boolean }> =>
    fetch(`/api/projects/${projectId}/media/${encodeURIComponent(filename)}`, { method: 'DELETE' }).then(r => json(r)),

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
}
