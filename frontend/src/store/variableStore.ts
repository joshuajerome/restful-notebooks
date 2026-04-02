import { create } from 'zustand'
import api from '../api/client'

export interface Variable {
  key: string
  value: string
}

interface VariableStore {
  variables: Variable[]
  fetchVariables: () => Promise<void>
  saveVariable: (key: string, value: string) => Promise<void>
  deleteVariable: (key: string) => Promise<void>
}

export const useVariableStore = create<VariableStore>((set) => ({
  variables: [],
  fetchVariables: async () => {
    try {
      const r = await api.get('/workspace/variables')
      const vars = r.data.variables || {}
      set({ variables: Object.entries(vars).map(([key, value]) => ({ key, value: String(value) })) })
    } catch (err) {
      console.error('Failed to fetch variables:', err)
    }
  },
  saveVariable: async (key, value) => {
    try {
      await api.put(`/workspace/variables/${encodeURIComponent(key)}`, { value })
      const r = await api.get('/workspace/variables')
      const vars = r.data.variables || {}
      set({ variables: Object.entries(vars).map(([k, v]) => ({ key: k, value: String(v) })) })
    } catch (err) {
      console.error('Failed to save variable:', err)
    }
  },
  deleteVariable: async (key) => {
    try {
      await api.delete(`/workspace/variables/${encodeURIComponent(key)}`)
      const r = await api.get('/workspace/variables')
      const vars = r.data.variables || {}
      set({ variables: Object.entries(vars).map(([k, v]) => ({ key: k, value: String(v) })) })
    } catch (err) {
      console.error('Failed to delete variable:', err)
    }
  },
}))
