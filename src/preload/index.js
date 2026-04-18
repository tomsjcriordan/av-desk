import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  settings: {
    get: (key) => ipcRenderer.invoke('settings:get', key),
    set: (key, value) => ipcRenderer.invoke('settings:set', key, value),
    getAll: () => ipcRenderer.invoke('settings:getAll'),
  },
  expenses: {
    list: () => ipcRenderer.invoke('expenses:list'),
    add: (data) => ipcRenderer.invoke('expenses:add', data),
    update: (id, data) => ipcRenderer.invoke('expenses:update', id, data),
    delete: (id) => ipcRenderer.invoke('expenses:delete', id),
  },
  clients: {
    list: () => ipcRenderer.invoke('clients:list'),
    upsert: (data) => ipcRenderer.invoke('clients:upsert', data),
    delete: (id) => ipcRenderer.invoke('clients:delete', id),
  },
})
