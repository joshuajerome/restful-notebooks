import { create } from 'zustand'
import api from '../api/client'

export interface Variable {
  id: string
  name: string
  value: string
  source: string
  json_path: string
  created_at: string
}

interface VariableStore {
  variables: Variable[]
  fetchVariables: () => Promise<void>
  saveVariable: (name: string, value: string, source: string, jsonPath: string) => Promise<void>
  deleteVariable: (id: string) => Promise<void>
}

export const useVariableStore = create<VariableStore>((set) => ({
  variables: [],
  fetchVariables: async () => {
    const r = await api.get('/variables')
    set({ variables: r.data.variables })
  },
  saveVariable: async (name, value, source, jsonPath) => {
    await api.post('/variables', { name, value, source, json_path: jsonPath })
    const r = await api.get('/variables')
    set({ variables: r.data.variables })
  },
  deleteVariable: async (id) => {
    await api.delete(`/variables/${id}`)
    const r = await api.get('/variables')
    set({ variables: r.data.variables })
  },
}))
