'use strict'
const { contextBridge, ipcRenderer } = require('electron')
contextBridge.exposeInMainWorld('cathedralDesktop', {
  platform: process.platform,
  reportReady: () => ipcRenderer.send('app:ready'),
  openMediaBrowser: () => ipcRenderer.invoke('app:media-browser'),
  checkForUpdate: () => ipcRenderer.invoke('app:update-check'),
  downloadUpdate: () => ipcRenderer.invoke('app:update-download'),
  installUpdate: () => ipcRenderer.invoke('app:update-install'),
  onUpdateStatus: (listener) => {
    const callback = (_event, status) => listener(status)
    ipcRenderer.on('app:update-status', callback)
    return () => ipcRenderer.removeListener('app:update-status', callback)
  },
  listDisplays: () => ipcRenderer.invoke('displays:list'),
  setDisplayRole: (id, role) => ipcRenderer.invoke('displays:assign', id, role),
  openDisplay: (id) => ipcRenderer.invoke('displays:open', id),
  closeDisplay: (id) => ipcRenderer.invoke('displays:close', id),
  openRole: (role) => ipcRenderer.invoke('displays:open-role', role),
  closeRole: (role) => ipcRenderer.invoke('displays:close-role', role),
  onDisplaysChanged: (listener) => {
    const callback = (_event, displays) => listener(displays)
    ipcRenderer.on('displays:changed', callback)
    return () => ipcRenderer.removeListener('displays:changed', callback)
  },
})
