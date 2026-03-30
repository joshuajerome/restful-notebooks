import { create } from 'zustand'

export interface ApiConfig {
  id: string
  name: string
  plugin: string
  base_url: string
  auth_type: 'bearer' | 'apikey' | 'none'
  login_path: string
  username: string
  password: string
  api_key: string
  api_key_header: string
}

export interface Workspace {
  id: string
  name: string
  color: string
  apis: ApiConfig[]
  variables: Record<string, string>
  created: string
}

const STORAGE_KEY = 'postit_workspaces_v2'
const ACTIVE_KEY = 'postit_active_workspace'

const COLORS = ['#1D63ED', '#38A169', '#C77D1A', '#C53030', '#319795', '#805AD5', '#D53F8C', '#718096']

function newApiConfig(partial?: Partial<ApiConfig>): ApiConfig {
  return {
    id: crypto.randomUUID().slice(0, 8),
    name: 'API',
    plugin: 'snf-instance-rest',
    base_url: '',
    auth_type: 'bearer',
    login_path: '/security/v1/auth/login',
    username: '',
    password: '',
    api_key: '',
    api_key_header: 'X-API-Key',
    ...partial,
  }
}

interface WorkspaceStore {
  workspaces: Workspace[]
  activeId: string | null
  active: Workspace | null

  load: () => void
  save: () => void
  setActive: (id: string) => void
  create: (name: string, color?: string) => Workspace
  update: (id: string, patch: Partial<Workspace>) => void
  remove: (id: string) => void
  duplicate: (id: string) => Workspace
  addApi: (wsId: string, api?: Partial<ApiConfig>) => void
  updateApi: (wsId: string, apiId: string, patch: Partial<ApiConfig>) => void
  removeApi: (wsId: string, apiId: string) => void
}

export const useWorkspaceStore = create<WorkspaceStore>((set, get) => {
  const persist = () => {
    const { workspaces, activeId } = get()
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workspaces))
    if (activeId) {
      localStorage.setItem(ACTIVE_KEY, activeId)
    } else {
      localStorage.removeItem(ACTIVE_KEY)
    }
  }

  return {
    workspaces: [],
    activeId: null,
    active: null,

    load: () => {
      const raw = localStorage.getItem(STORAGE_KEY)
      let workspaces: Workspace[] = raw ? JSON.parse(raw) : []
      // Migrate from v1 format
      if (workspaces.length === 0) {
        const v1 = localStorage.getItem('postit_workspaces')
        if (v1) {
          const old = JSON.parse(v1) as any[]
          workspaces = old.map((o, i) => ({
            id: o.id,
            name: o.name,
            color: COLORS[i % COLORS.length],
            apis: [newApiConfig({ plugin: o.plugin })],
            variables: {},
            created: o.created,
          }))
        }
      }
      if (workspaces.length === 0) {
        workspaces = [{
          id: 'default', name: 'default', color: COLORS[0],
          apis: [newApiConfig()], variables: {}, created: new Date().toISOString(),
        }]
      }
      const activeId = localStorage.getItem(ACTIVE_KEY) || workspaces[0].id
      set({ workspaces, activeId, active: workspaces.find((w) => w.id === activeId) || workspaces[0] })
      localStorage.setItem(STORAGE_KEY, JSON.stringify(workspaces))
    },

    save: persist,

    setActive: (id) => {
      const ws = get().workspaces.find((w) => w.id === id)
      if (ws) {
        set({ activeId: id, active: ws })
        localStorage.setItem(ACTIVE_KEY, id)
      }
    },

    create: (name, color) => {
      const ws: Workspace = {
        id: crypto.randomUUID().slice(0, 8),
        name: name || 'untitled',
        color: color || COLORS[get().workspaces.length % COLORS.length],
        apis: [newApiConfig()],
        variables: {},
        created: new Date().toISOString(),
      }
      set((s) => ({ workspaces: [...s.workspaces, ws] }))
      persist()
      return ws
    },

    update: (id, patch) => {
      set((s) => {
        const workspaces = s.workspaces.map((w) => w.id === id ? { ...w, ...patch } : w)
        const active = s.activeId === id ? workspaces.find((w) => w.id === id) || s.active : s.active
        return { workspaces, active }
      })
      persist()
    },

    remove: (id) => {
      set((s) => {
        const workspaces = s.workspaces.filter((w) => w.id !== id)
        const wasActive = s.activeId === id
        const newActiveId = wasActive ? (workspaces[0]?.id || null) : s.activeId
        const newActive = newActiveId ? workspaces.find((w) => w.id === newActiveId) || null : null
        return { workspaces, activeId: newActiveId, active: newActive }
      })
      persist()
    },

    duplicate: (id) => {
      const src = get().workspaces.find((w) => w.id === id)
      if (!src) throw new Error('Workspace not found')
      const ws: Workspace = {
        ...src,
        id: crypto.randomUUID().slice(0, 8),
        name: `${src.name} (copy)`,
        created: new Date().toISOString(),
      }
      set((s) => ({ workspaces: [...s.workspaces, ws] }))
      persist()
      return ws
    },

    addApi: (wsId, api) => {
      set((s) => ({
        workspaces: s.workspaces.map((w) =>
          w.id === wsId ? { ...w, apis: [...w.apis, newApiConfig(api)] } : w
        ),
      }))
      persist()
    },

    updateApi: (wsId, apiId, patch) => {
      set((s) => ({
        workspaces: s.workspaces.map((w) =>
          w.id === wsId ? { ...w, apis: w.apis.map((a) => a.id === apiId ? { ...a, ...patch } : a) } : w
        ),
      }))
      persist()
    },

    removeApi: (wsId, apiId) => {
      set((s) => ({
        workspaces: s.workspaces.map((w) =>
          w.id === wsId ? { ...w, apis: w.apis.filter((a) => a.id !== apiId) } : w
        ),
      }))
      persist()
    },
  }
})

export const WORKSPACE_COLORS = COLORS
