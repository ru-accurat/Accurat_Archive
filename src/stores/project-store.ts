import { create } from 'zustand'
import type { Project } from '../lib/types'

export interface Filters {
  search: string
  domains: string[]
  services: string[]
  output: string[]
  section: string[]
  yearRange: [number | null, number | null]
  tier: number[]
  missing: string[]
  status: string[]
}

export interface ProjectStore {
  projects: Project[]
  loading: boolean
  filters: Filters
  sortField: string
  sortDirection: 'asc' | 'desc'
  selectedIds: string[]

  setProjects: (projects: Project[]) => void
  setLoading: (loading: boolean) => void
  setSearch: (search: string) => void
  setFilter: <K extends keyof Filters>(key: K, value: Filters[K]) => void
  clearFilters: () => void
  setSort: (field: string, direction?: 'asc' | 'desc') => void
  updateProject: (id: string, data: Partial<Project>) => void
  addProject: (project: Project) => void
  removeProject: (id: string) => void
  toggleSelection: (id: string) => void
  selectAll: (ids: string[]) => void
  clearSelection: () => void
}

const defaultFilters: Filters = {
  search: '',
  domains: [],
  services: [],
  output: [],
  section: [],
  yearRange: [null, null],
  tier: [],
  missing: [],
  status: []
}

export const useProjectStore = create<ProjectStore>((set) => ({
  projects: [],
  loading: true,
  filters: { ...defaultFilters },
  sortField: 'client',
  sortDirection: 'asc',
  selectedIds: [],

  setProjects: (projects) => set({ projects, loading: false }),
  setLoading: (loading) => set({ loading }),

  setSearch: (search) =>
    set((state) => ({ filters: { ...state.filters, search } })),

  setFilter: (key, value) =>
    set((state) => ({ filters: { ...state.filters, [key]: value } })),

  clearFilters: () => set({ filters: { ...defaultFilters } }),

  setSort: (field, direction) =>
    set((state) => ({
      sortField: field,
      sortDirection:
        direction || (state.sortField === field && state.sortDirection === 'asc' ? 'desc' : 'asc')
    })),

  updateProject: (id, data) =>
    set((state) => ({
      projects: state.projects.map((p) => (p.id === id ? { ...p, ...data } : p))
    })),

  addProject: (project) =>
    set((state) => ({ projects: [...state.projects, project] })),

  removeProject: (id) =>
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
      selectedIds: state.selectedIds.filter((s) => s !== id)
    })),

  toggleSelection: (id) =>
    set((state) => ({
      selectedIds: state.selectedIds.includes(id)
        ? state.selectedIds.filter((s) => s !== id)
        : [...state.selectedIds, id]
    })),

  selectAll: (ids) => set({ selectedIds: ids }),

  clearSelection: () => set({ selectedIds: [] })
}))
