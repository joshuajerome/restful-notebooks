import { create } from 'zustand'
import api from '../api/client'

export interface EndpointInfo {
  name: string
  display_name: string
  path: string
  methods: string[]
  group: string
}

interface EndpointStore {
  endpoints: EndpointInfo[]
  groups: string[]
  loading: boolean
  search: string
  selectedGroup: string
  setSearch: (s: string) => void
  setSelectedGroup: (g: string) => void
  fetchEndpoints: () => Promise<void>
  fetchGroups: () => Promise<void>
}

export const useEndpointStore = create<EndpointStore>((set) => ({
  endpoints: [],
  groups: [],
  loading: false,
  search: '',
  selectedGroup: '',
  setSearch: (s) => set({ search: s }),
  setSelectedGroup: (g) => set({ selectedGroup: g }),
  fetchEndpoints: async () => {
    set({ loading: true })
    try {
      const r = await api.get('/endpoints')
      set({ endpoints: r.data.endpoints })
    } finally {
      set({ loading: false })
    }
  },
  fetchGroups: async () => {
    const r = await api.get('/endpoints/groups')
    set({ groups: r.data })
  },
}))
