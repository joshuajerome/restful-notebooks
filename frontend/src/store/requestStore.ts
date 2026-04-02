import { create } from 'zustand'
import api from '../api/client'

export interface ResponseData {
  status_code: number
  method: string
  url: string
  body: any
  headers: Record<string, string>
  duration_ms: number
  history_id: string
}

interface SessionState {
  method: string
  endpointName: string
  endpointPath: string
  params: Record<string, string>
  query: Record<string, string>
  payload: string
  response: ResponseData | null
}

const SESSION_KEY = 'postit_request_sessions'

function loadSessions(): Record<string, SessionState> {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || '{}') } catch { return {} }
}

function saveSessions(sessions: Record<string, SessionState>) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(sessions))
}

const defaultSession: SessionState = {
  method: 'GET', endpointName: '', endpointPath: '', params: {}, query: {}, payload: '{}', response: null,
}

interface RequestStore extends SessionState {
  loading: boolean
  currentWorkspaceId: string
  setMethod: (m: string) => void
  setEndpoint: (name: string, path: string) => void
  setParams: (p: Record<string, string>) => void
  setQuery: (q: Record<string, string>) => void
  setPayload: (p: string) => void
  execute: (apiAlias?: string) => Promise<void>
  switchWorkspace: (wsId: string) => void
}

export const useRequestStore = create<RequestStore>((set, get) => {
  const persistCurrent = () => {
    const { currentWorkspaceId, method, endpointName, endpointPath, params, query, payload, response } = get()
    if (!currentWorkspaceId) return
    const sessions = loadSessions()
    sessions[currentWorkspaceId] = { method, endpointName, endpointPath, params, query, payload, response }
    saveSessions(sessions)
  }

  return {
    ...defaultSession,
    loading: false,
    currentWorkspaceId: '',

    setMethod: (m) => { set({ method: m }); persistCurrent() },
    setEndpoint: (name, path) => { set({ endpointName: name, endpointPath: path }); persistCurrent() },
    setParams: (p) => { set({ params: p }); persistCurrent() },
    setQuery: (q) => { set({ query: q }); persistCurrent() },
    setPayload: (p) => { set({ payload: p }); persistCurrent() },

    switchWorkspace: (wsId) => {
      // Save current session
      persistCurrent()
      // Load target session
      const sessions = loadSessions()
      const session = sessions[wsId] || { ...defaultSession }
      set({ currentWorkspaceId: wsId, ...session })
    },

    execute: async (apiAlias?) => {
      const { method, endpointName, endpointPath, params, query, payload } = get()
      set({ loading: true, response: null })
      try {
        let parsedPayload = null
        if (method !== 'GET' && payload?.trim() && payload.trim() !== '{}') {
          try { parsedPayload = JSON.parse(payload) } catch { parsedPayload = null }
        }
        const r = await api.post('/requests/execute', {
          method, endpoint_name: endpointName, endpoint_path: endpointPath,
          api_alias: apiAlias || '',
          params: Object.keys(params).length ? params : null,
          query: Object.keys(query).length ? query : null,
          payload: parsedPayload,
        })
        set({ response: r.data })
        persistCurrent()
      } catch (err: any) {
        const resp = {
          status_code: err.response?.status || 0, method, url: '',
          body: err.response?.data || { error: err.message },
          headers: {}, duration_ms: 0, history_id: '',
        }
        set({ response: resp })
        persistCurrent()
      } finally {
        set({ loading: false })
      }
    },
  }
})
