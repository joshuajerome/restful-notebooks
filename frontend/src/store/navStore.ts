import { create } from 'zustand'

interface NavStore {
  history: string[]
  index: number
  push: (path: string) => void
  canGoBack: () => boolean
  canGoForward: () => boolean
  goBack: () => string | null
  goForward: () => string | null
}

export const useNavStore = create<NavStore>((set, get) => ({
  history: [],
  index: -1,

  push: (path) => set((s) => {
    // Trim forward history when navigating to a new page
    const trimmed = s.history.slice(0, s.index + 1)
    if (trimmed[trimmed.length - 1] === path) return s // no duplicate
    return { history: [...trimmed, path], index: trimmed.length }
  }),

  canGoBack: () => get().index > 0,
  canGoForward: () => get().index < get().history.length - 1,

  goBack: () => {
    const { index, history } = get()
    if (index <= 0) return null
    set({ index: index - 1 })
    return history[index - 1]
  },

  goForward: () => {
    const { index, history } = get()
    if (index >= history.length - 1) return null
    set({ index: index + 1 })
    return history[index + 1]
  },
}))
