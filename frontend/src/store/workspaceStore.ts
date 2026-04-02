import { create } from 'zustand'

export interface ApiConfig {
  id: string
  name: string
  alias: string
  plugin: string
  source_file: string
  base_url: string
  plugin_path: string
  auth_type: 'bearer' | 'apikey' | 'none'
  login_path: string
  username: string
  password_env: string
  password: string
  api_key: string
  api_key_header: string
  api_key_env: string
  credential_mode: 'manual' | 'env'
}

export interface Workspace {
  id: string
  name: string
  path: string
  color: string
  apis: ApiConfig[]
  variables: Record<string, string>
  created: string
}

const STORAGE_KEY = 'restful_workspaces_v2'
const ACTIVE_KEY = 'restful_active_workspace'

const COLORS = ['#1D63ED', '#38A169', '#C77D1A', '#C53030', '#319795', '#805AD5', '#D53F8C', '#718096']

/** Derive alias from API name: lowercase, trim, replace spaces/hyphens with underscores, strip non-alphanumeric. */
export function deriveAlias(name: string): string {
  return name.trim().toLowerCase().replace(/[\s-]+/g, '_').replace(/[^a-z0-9_]/g, '') || 'api'
}

function newApiConfig(partial?: Partial<ApiConfig>): ApiConfig {
  return {
    id: crypto.randomUUID().slice(0, 8),
    name: 'API',
    alias: 'api',
    plugin: '',
    source_file: '',
    base_url: '',
    plugin_path: '',
    auth_type: 'bearer',
    login_path: '/security/v1/auth/login',
    username: '',
    password_env: '',
    password: '',
    api_key: '',
    api_key_header: 'X-API-Key',
    api_key_env: '',
    credential_mode: 'manual',
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
  create: (name: string, color?: string, path?: string) => Workspace
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
      let workspaces: Workspace[] = []
      try { workspaces = raw ? JSON.parse(raw) : [] } catch { workspaces = [] }

      // Sync with backend — discover workspaces on disk that aren't in localStorage
      fetch('/api/workspace/list').then((r) => r.json()).then((diskWs: { name: string; path: string }[]) => {
        const { workspaces: current } = get()
        const knownPaths = new Set(current.map((w) => w.path).filter(Boolean))
        let added = false
        for (const dw of diskWs) {
          if (!knownPaths.has(dw.path)) {
            current.push({
              id: crypto.randomUUID().slice(0, 8),
              name: dw.name,
              path: dw.path,
              color: COLORS[current.length % COLORS.length],
              apis: [], variables: {},
              created: new Date().toISOString(),
            })
            added = true
          }
        }
        if (added) {
          set({ workspaces: [...current] })
          persist()
        }
      }).catch(() => { /* backend not available */ })

      if (workspaces.length === 0) {
        workspaces = []
      }
      const activeId = localStorage.getItem(ACTIVE_KEY) || (workspaces[0]?.id ?? null)
      set({ workspaces, activeId, active: workspaces.find((w) => w.id === activeId) || null })
      if (workspaces.length > 0) localStorage.setItem(STORAGE_KEY, JSON.stringify(workspaces))
    },

    save: persist,

    setActive: (id) => {
      const ws = get().workspaces.find((w) => w.id === id)
      if (ws) {
        set({ activeId: id, active: ws })
        localStorage.setItem(ACTIVE_KEY, id)
      }
    },

    create: (name, color, path) => {
      const ws: Workspace = {
        id: crypto.randomUUID().slice(0, 8),
        name: name || 'untitled',
        path: path || '',
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
