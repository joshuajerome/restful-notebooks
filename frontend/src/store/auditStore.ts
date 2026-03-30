import { create } from 'zustand'

export type AuditEventType =
  | 'workspace_created' | 'workspace_deleted' | 'workspace_updated' | 'workspace_switched'
  | 'api_added' | 'api_removed' | 'api_updated'
  | 'request_sent' | 'variable_added' | 'variable_removed'
  | 'session_start' | 'session_change'

export interface AuditEvent {
  id: string
  type: AuditEventType
  message: string
  details?: string
  timestamp: number
}

const STORAGE_KEY = 'postit_audit_log'
const MAX_EVENTS = 500

interface AuditStore {
  events: AuditEvent[]
  log: (type: AuditEventType, message: string, details?: string) => void
  clear: () => void
  load: () => void
}

export const useAuditStore = create<AuditStore>((set, get) => ({
  events: [],

  log: (type, message, details) => {
    const event: AuditEvent = {
      id: crypto.randomUUID().slice(0, 8),
      type, message, details,
      timestamp: Date.now(),
    }
    set((s) => {
      const events = [event, ...s.events].slice(0, MAX_EVENTS)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(events))
      return { events }
    })
  },

  clear: () => {
    localStorage.removeItem(STORAGE_KEY)
    set({ events: [] })
  },

  load: () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) set({ events: JSON.parse(raw) })
    } catch { /* ignore */ }
  },
}))
