import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import Store from 'electron-store'
import {
  getDb,
  listExpenses, addExpense, updateExpense, deleteExpense,
  listClients, upsertClient, deleteClient,
  listInvoices, getNextInvoiceNumber, addInvoice, updateInvoice, deleteInvoice,
  listVenues, addVenue, deleteVenue,
  listRooms, addRoom, updateRoomStatus, deleteRoom, resetRooms,
} from './db'
import { handleAgentChat, handleAgentSelectImage } from './agentHandlers'

const store = new Store()

function createWindow() {
  const win = new BrowserWindow({
    width: 1200, height: 800, minWidth: 900, minHeight: 600,
    titleBarStyle: 'hiddenInset', backgroundColor: '#1c1c1e',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false, contextIsolation: true, nodeIntegration: false,
    },
  })
  if (process.env.NODE_ENV === 'development') {
    win.loadURL(process.env.ELECTRON_RENDERER_URL)
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

ipcMain.handle('settings:get', (_e, key) => store.get(key))
ipcMain.handle('settings:set', (_e, key, value) => store.set(key, value))
ipcMain.handle('settings:getAll', () => store.store)

ipcMain.handle('expenses:list', () => listExpenses(getDb(app.getPath.bind(app))))
ipcMain.handle('expenses:add', (_e, data) => addExpense(getDb(app.getPath.bind(app)), data))
ipcMain.handle('expenses:update', (_e, id, data) => updateExpense(getDb(app.getPath.bind(app)), id, data))
ipcMain.handle('expenses:delete', (_e, id) => deleteExpense(getDb(app.getPath.bind(app)), id))

ipcMain.handle('clients:list', () => listClients(getDb(app.getPath.bind(app))))
ipcMain.handle('clients:upsert', (_e, data) => upsertClient(getDb(app.getPath.bind(app)), data))
ipcMain.handle('clients:delete', (_e, id) => deleteClient(getDb(app.getPath.bind(app)), id))

ipcMain.handle('invoices:list', () => listInvoices(getDb(app.getPath.bind(app))))
ipcMain.handle('invoices:nextNumber', () => getNextInvoiceNumber(getDb(app.getPath.bind(app))))
ipcMain.handle('invoices:add', (_e, data) => addInvoice(getDb(app.getPath.bind(app)), data))
ipcMain.handle('invoices:update', (_e, id, data) => updateInvoice(getDb(app.getPath.bind(app)), id, data))
ipcMain.handle('invoices:delete', (_e, id) => deleteInvoice(getDb(app.getPath.bind(app)), id))

// IPC: Venues
ipcMain.handle('venues:list', () => listVenues(getDb(app.getPath.bind(app))))
ipcMain.handle('venues:add', (_e, data) => addVenue(getDb(app.getPath.bind(app)), data))
ipcMain.handle('venues:delete', (_e, id) => deleteVenue(getDb(app.getPath.bind(app)), id))

// IPC: Rooms
ipcMain.handle('rooms:list', (_e, venueId) => listRooms(getDb(app.getPath.bind(app)), venueId))
ipcMain.handle('rooms:add', (_e, data) => addRoom(getDb(app.getPath.bind(app)), data))
ipcMain.handle('rooms:updateStatus', (_e, id, status) => updateRoomStatus(getDb(app.getPath.bind(app)), id, status))
ipcMain.handle('rooms:delete', (_e, id) => deleteRoom(getDb(app.getPath.bind(app)), id))
ipcMain.handle('rooms:reset', (_e, venueId) => resetRooms(getDb(app.getPath.bind(app)), venueId))

// IPC: AV Agent
ipcMain.handle('agent:chat', (_e, messages) => handleAgentChat(messages))
ipcMain.handle('agent:selectImage', () => handleAgentSelectImage())

app.whenReady().then(createWindow)
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
