const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  selectDirectory: () => ipcRenderer.invoke("select-directory"),
  selectFile: (filters) => ipcRenderer.invoke("select-file", filters),
  getVersion: () => ipcRenderer.invoke("get-version"),
  isDev: () => ipcRenderer.invoke("is-dev"),
});
