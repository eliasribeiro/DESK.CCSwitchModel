const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('ccswitch', {
  selectRoot: async () => {
    const p = await ipcRenderer.invoke('select-root')
    return p || null
  },
  saveSettings: async (data) => {
    const res = await ipcRenderer.invoke('save-settings', data)
    return res
  },
  openPath: (path) => ipcRenderer.invoke('open-path', path),
  setCredential: async ({ provider, apiKey }) => {
    const res = await ipcRenderer.invoke('credential-set', { provider, apiKey })
    return res
  },
  getCredential: async (provider) => {
    const res = await ipcRenderer.invoke('credential-get', provider)
    return res
  }
})
