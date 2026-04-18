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
  invoices: {
    list: () => ipcRenderer.invoke('invoices:list'),
    nextNumber: () => ipcRenderer.invoke('invoices:nextNumber'),
    add: (data) => ipcRenderer.invoke('invoices:add', data),
    update: (id, data) => ipcRenderer.invoke('invoices:update', id, data),
    delete: (id) => ipcRenderer.invoke('invoices:delete', id),
  },
  venues: {
    list: () => ipcRenderer.invoke('venues:list'),
    add: (data) => ipcRenderer.invoke('venues:add', data),
    delete: (id) => ipcRenderer.invoke('venues:delete', id),
  },
  rooms: {
    list: (venueId) => ipcRenderer.invoke('rooms:list', venueId),
    add: (data) => ipcRenderer.invoke('rooms:add', data),
    updateStatus: (id, status) => ipcRenderer.invoke('rooms:updateStatus', id, status),
    delete: (id) => ipcRenderer.invoke('rooms:delete', id),
    reset: (venueId) => ipcRenderer.invoke('rooms:reset', venueId),
  },
  posts: {
    list: (account) => ipcRenderer.invoke('posts:list', account),
    add: (data) => ipcRenderer.invoke('posts:add', data),
    delete: (id) => ipcRenderer.invoke('posts:delete', id),
    stats: (account) => ipcRenderer.invoke('posts:stats', account),
  },
  suggestions: {
    list: (account, status) => ipcRenderer.invoke('suggestions:list', account, status),
    add: (data) => ipcRenderer.invoke('suggestions:add', data),
    updateStatus: (id, status) => ipcRenderer.invoke('suggestions:updateStatus', id, status),
  },
  content: {
    buildPrompt: (account, mode) => ipcRenderer.invoke('content:buildPrompt', account, mode),
  },
  agent: {
    chat: (messages, systemPrompt) => ipcRenderer.invoke('agent:chat', messages, systemPrompt),
    selectImage: () => ipcRenderer.invoke('agent:selectImage'),
  },
})
