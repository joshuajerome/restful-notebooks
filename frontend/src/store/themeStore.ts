import { create } from 'zustand'

export type ThemeId = 'dark' | 'light' | 'system'

interface ThemeStore {
  themeId: ThemeId
  sidebarCollapsed: boolean
  setTheme: (id: ThemeId) => void
  toggleSidebar: () => void
}

export const useThemeStore = create<ThemeStore>((set) => ({
  themeId: (localStorage.getItem('postit_theme') as ThemeId) || 'dark',
  sidebarCollapsed: localStorage.getItem('postit_sidebar_collapsed') === 'true',
  setTheme: (id) => {
    localStorage.setItem('postit_theme', id)
    set({ themeId: id })
  },
  toggleSidebar: () =>
    set((s) => {
      const next = !s.sidebarCollapsed
      localStorage.setItem('postit_sidebar_collapsed', String(next))
      return { sidebarCollapsed: next }
    }),
}))
