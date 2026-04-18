import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import Store from 'electron-store'

const store = new Store()

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#1c1c1e',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false, // required: better-sqlite3 (native module) needs Node.js access in preload
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (process.env.NODE_ENV === 'development') {
    win.loadURL(process.env.ELECTRON_RENDERER_URL)
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// IPC: Settings
ipcMain.handle('settings:get', (_event, key) => store.get(key))
ipcMain.handle('settings:set', (_event, key, value) => store.set(key, value))
ipcMain.handle('settings:getAll', () => store.store)

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
