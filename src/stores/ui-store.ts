import { create } from 'zustand'

export interface UiStore {
  viewMode: 'table' | 'grid'
  editMode: boolean

  setViewMode: (mode: 'table' | 'grid') => void
  setEditMode: (editing: boolean) => void
}

export const useUiStore = create<UiStore>((set) => ({
  viewMode: 'grid',
  editMode: false,

  setViewMode: (viewMode) => set({ viewMode }),
  setEditMode: (editMode) => set({ editMode })
}))
