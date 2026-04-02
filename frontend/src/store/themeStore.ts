import { create } from 'zustand'

export type ThemeId = 'dark' | 'light' | 'system'

interface ThemeStore {
  themeId: ThemeId
  sidebarCollapsed: boolean
  tempWorkspaceColor: string
  setTheme: (id: ThemeId) => void
  toggleSidebar: () => void
  setTempWorkspaceColor: (color: string) => void
}

export const useThemeStore = create<ThemeStore>((set) => ({
  themeId: (localStorage.getItem('restful_theme') as ThemeId) || 'dark',
  sidebarCollapsed: localStorage.getItem('restful_sidebar_collapsed') === 'true',
  tempWorkspaceColor: localStorage.getItem('restful_temp_ws_color') || '#E57C23',
  setTheme: (id) => {
    localStorage.setItem('restful_theme', id)
    set({ themeId: id })
  },
  toggleSidebar: () =>
    set((s) => {
      const next = !s.sidebarCollapsed
      localStorage.setItem('restful_sidebar_collapsed', String(next))
      return { sidebarCollapsed: next }
    }),
  setTempWorkspaceColor: (color) => {
    localStorage.setItem('restful_temp_ws_color', color)
    set({ tempWorkspaceColor: color })
  },
}))
