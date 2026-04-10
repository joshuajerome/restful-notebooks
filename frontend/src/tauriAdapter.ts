/**
 * Tauri adapter — maps window.electronAPI to Tauri equivalents.
 * Import this at the top of main.tsx when running under Tauri.
 * Existing code uses (window as any).electronAPI?.method() with optional chaining,
 * so this adapter makes everything work without touching any other files.
 */

import { open } from '@tauri-apps/plugin-dialog'
import { revealItemInDir } from '@tauri-apps/plugin-opener'
import { getVersion } from '@tauri-apps/api/app'
import { invoke } from '@tauri-apps/api/core'
import { check } from '@tauri-apps/plugin-updater'

let _updateAvailableCb: ((info: any) => void) | null = null
let _updateDownloadedCb: (() => void) | null = null
let _pendingUpdate: any = null

// Check for updates on startup (non-blocking)
async function checkForUpdatesOnStartup() {
  try {
    const update = await check()
    if (update) {
      _pendingUpdate = update
      _updateAvailableCb?.({ version: update.version })

      // Auto-download
      await update.downloadAndInstall((event) => {
        if (event.event === 'Finished') {
          _updateDownloadedCb?.()
        }
      })
    }
  } catch (e) {
    console.log('[updater] Check failed:', e)
  }
}

const tauriAPI = {
  selectDirectory: async () => {
    const result = await open({ directory: true, multiple: false })
    return result ?? null
  },

  selectFile: async (filters?: Array<{ name: string; extensions: string[] }>) => {
    const result = await open({
      multiple: false,
      filters: filters?.map((f) => ({ name: f.name, extensions: f.extensions })),
    })
    return result ?? null
  },

  showItemInFolder: async (path: string) => {
    try {
      await revealItemInDir(path)
    } catch {
      await navigator.clipboard.writeText(path)
    }
  },

  getVersion: () => getVersion(),

  isDev: () => invoke<boolean>('is_dev'),

  onFullscreenChange: (_callback: (isFullscreen: boolean) => void) => {
    // TODO: wire up Tauri window resize events
  },

  onUpdateAvailable: (callback: (info: any) => void) => {
    _updateAvailableCb = callback
  },

  onUpdateDownloaded: (callback: () => void) => {
    _updateDownloadedCb = callback
  },

  installUpdate: async () => {
    if (_pendingUpdate) {
      await _pendingUpdate.install()
      // Tauri restarts automatically after install
    }
  },

  checkForUpdates: () => checkForUpdatesOnStartup(),
}

// Assign to window.electronAPI so existing code works unchanged
;(window as any).electronAPI = tauriAPI

// Auto-check for updates after a short delay
if (!import.meta.env.DEV) {
  setTimeout(checkForUpdatesOnStartup, 5000)
}
