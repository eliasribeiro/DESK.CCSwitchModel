import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('ccswitch', {
  selectRoot: async () => {
    const p = await ipcRenderer.invoke('select-root')
    return p || null
  },
  saveSettings: async (data) => {
    const res = await ipcRenderer.invoke('save-settings', data)
    return res
  },
  openPath: (path) => ipcRenderer.invoke('open-path', path)
})
