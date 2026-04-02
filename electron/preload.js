const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  selectDirectory: () => ipcRenderer.invoke("select-directory"),
  selectFile: (filters) => ipcRenderer.invoke("select-file", filters),
  getVersion: () => ipcRenderer.invoke("get-version"),
  isDev: () => ipcRenderer.invoke("is-dev"),
  onFullscreenChange: (callback) => {
    ipcRenderer.on("fullscreen-changed", (_, isFullscreen) => callback(isFullscreen));
  },
  onUpdateAvailable: (callback) => {
    ipcRenderer.on("update-available", (_, info) => callback(info));
  },
  onUpdateDownloaded: (callback) => {
    ipcRenderer.on("update-downloaded", () => callback());
  },
  installUpdate: () => ipcRenderer.invoke("install-update"),
  checkForUpdates: () => ipcRenderer.invoke("check-for-updates"),
});
