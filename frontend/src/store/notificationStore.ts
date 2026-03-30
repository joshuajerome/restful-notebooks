import { create } from 'zustand'

export interface Notification {
  id: string
  message: string
  severity: 'success' | 'info' | 'warning' | 'error'
  timestamp: number
  read: boolean
}

interface NotificationStore {
  notifications: Notification[]
  panelOpen: boolean
  add: (message: string, severity?: Notification['severity']) => void
  markAllRead: () => void
  clear: () => void
  togglePanel: () => void
  closePanel: () => void
  unreadCount: () => number
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],
  panelOpen: false,

  add: (message, severity = 'info') => {
    const n: Notification = {
      id: crypto.randomUUID().slice(0, 8),
      message,
      severity,
      timestamp: Date.now(),
      read: false,
    }
    set((s) => ({ notifications: [n, ...s.notifications].slice(0, 100) }))
  },

  markAllRead: () => set((s) => ({
    notifications: s.notifications.map((n) => ({ ...n, read: true })),
  })),

  clear: () => set({ notifications: [] }),
  togglePanel: () => set((s) => ({ panelOpen: !s.panelOpen })),
  closePanel: () => set({ panelOpen: false }),
  unreadCount: () => get().notifications.filter((n) => !n.read).length,
}))
