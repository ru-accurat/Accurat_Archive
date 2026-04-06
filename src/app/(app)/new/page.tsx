'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useProjectStore } from '@/stores/project-store'
import { api } from '@/lib/api-client'
import { projectToSummary } from '@/lib/db-utils'

export default function NewProjectPage() {
  const router = useRouter()
  const addProject = useProjectStore((s) => s.addProject)
  const [client, setClient] = useState('')
  const [projectName, setProjectName] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  const fullName = client && projectName ? `${client} - ${projectName}` : ''

  const handleCreate = async () => {
    if (!client.trim() || !projectName.trim()) {
      setError('Both Client and Project Name are required.')
      return
    }
    setCreating(true)
    setError('')
    try {
      const newProject = await api.createProject(client.trim(), projectName.trim())
      addProject(projectToSummary(newProject))
      router.push(`/project/${newProject.id}`)
    } catch (err) {
      setError(String(err))
    }
    setCreating(false)
  }

  return (
    <div className="h-full flex items-center justify-center bg-[var(--c-black)]">
      <div className="w-full max-w-md px-[80px]">
        <h1 className="text-[2rem] font-[250] tracking-[-0.03em] text-white mb-10">New Case Study</h1>
        <div className="flex flex-col gap-6">
          <div>
            <label className="text-[10px] font-[500] uppercase tracking-[0.1em] text-white/40 block mb-2">Client</label>
            <input
              type="text" value={client} onChange={(e) => setClient(e.target.value)}
              placeholder="e.g. Google, Ferrari, Triennale Milano"
              className="w-full px-0 py-2 text-[14px] font-[350] bg-transparent border-b border-white/20 focus:border-white/60 focus:outline-none transition-colors duration-200 text-white placeholder:text-white/20"
              autoFocus
            />
          </div>
          <div>
            <label className="text-[10px] font-[500] uppercase tracking-[0.1em] text-white/40 block mb-2">Project Name</label>
            <input
              type="text" value={projectName} onChange={(e) => setProjectName(e.target.value)}
              placeholder="e.g. Building Hopes, Annual Report 2024"
              className="w-full px-0 py-2 text-[14px] font-[350] bg-transparent border-b border-white/20 focus:border-white/60 focus:outline-none transition-colors duration-200 text-white placeholder:text-white/20"
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
          </div>
          {fullName && (
            <div className="text-[11px] text-white/30 font-[400]">
              Full Name: <span className="text-white/60 font-[450]">{fullName}</span>
            </div>
          )}
          {error && <div className="text-[12px] font-[400] text-[var(--c-error)]">{error}</div>}
          <div className="flex gap-4 mt-4">
            <button onClick={() => router.push('/')} className="flex-1 text-[13px] font-[400] px-4 py-2.5 rounded-[var(--radius-sm)] bg-white/10 text-white/60 hover:bg-white/15 hover:text-white transition-all duration-200">Cancel</button>
            <button onClick={handleCreate} disabled={creating || !client.trim() || !projectName.trim()} className="flex-1 text-[13px] font-[450] px-4 py-2.5 rounded-[var(--radius-sm)] bg-white text-[var(--c-black)] hover:bg-white/90 transition-all duration-200 disabled:opacity-30">
              {creating ? 'Creating...' : 'Create & Edit'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
