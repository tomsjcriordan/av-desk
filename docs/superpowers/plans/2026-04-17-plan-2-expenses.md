# Plan 2: Expenses Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full Expenses screen — gig tracking with add/edit/delete, saved clients, and PDF export.

**Architecture:** SQLite via `better-sqlite3` in the main process (IPC bridge) stores expenses and clients. The renderer calls `window.electronAPI.expenses.*` and `window.electronAPI.clients.*`. The Expenses screen owns a view-state machine (`list` | `add` | `edit`) and renders sub-components for the list and form. PDF export runs in the renderer using `jspdf`. Gmail OAuth receipt import is deferred to a future plan.

**Tech Stack:** Electron IPC, better-sqlite3 (already installed), jspdf (install in this plan), React 19, Vitest (jsdom for renderer tests, node for DB tests)

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/main/db.js` | Create | SQLite setup, migrate, all CRUD functions |
| `src/main/index.js` | Modify | Add expenses + clients IPC handlers |
| `src/preload/index.js` | Modify | Expose `electronAPI.expenses` + `electronAPI.clients` |
| `src/renderer/src/screens/Expenses.jsx` | Modify | View-state machine: list / add / edit |
| `src/renderer/src/screens/expenses/ExpenseList.jsx` | Create | Table with date filter, delete, edit trigger |
| `src/renderer/src/screens/expenses/ExpenseForm.jsx` | Create | Add/edit form with client autocomplete |
| `src/renderer/src/screens/expenses/exportPdf.js` | Create | jspdf report builder |
| `vitest.config.js` | Modify | Add environmentMatchGlobs (node for main/, jsdom for renderer/) |
| `tests/main/db.expenses.test.js` | Create | DB CRUD unit tests (Node env) |
| `tests/renderer/Expenses.test.jsx` | Create | Screen integration tests (jsdom env) |

---

## Task 1: Install jspdf + update vitest config

**Files:**
- Modify: `vitest.config.js`

- [ ] **Step 1: Install jspdf**

```bash
cd /Users/tomfreekinr/av-desk && npm install jspdf
```

Expected: `added 1 package` (or similar), no errors.

- [ ] **Step 2: Update vitest.config.js to support both Node and jsdom environments**

Replace the entire file:

```js
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    setupFiles: ['./tests/setup.js'],
    environmentMatchGlobs: [
      ['tests/main/**', 'node'],
      ['tests/renderer/**', 'jsdom'],
    ],
  },
})
```

- [ ] **Step 3: Run existing tests to confirm nothing broke**

```bash
cd /Users/tomfreekinr/av-desk && npm test
```

Expected: all 3 existing renderer tests pass.

- [ ] **Step 4: Commit**

```bash
cd /Users/tomfreekinr/av-desk && git add vitest.config.js package.json package-lock.json && git commit -m "chore: install jspdf and split vitest environments by folder"
```

---

## Task 2: DB layer (TDD)

**Files:**
- Create: `src/main/db.js`
- Create: `tests/main/db.expenses.test.js`

- [ ] **Step 1: Write the failing DB tests**

Create `tests/main/db.expenses.test.js`:

```js
// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import {
  initDb,
  listExpenses,
  addExpense,
  updateExpense,
  deleteExpense,
  listClients,
  upsertClient,
  deleteClient,
} from '../../src/main/db'

let db

beforeEach(() => {
  // In-memory DB, fresh for each test
  db = new Database(':memory:')
  initDb(db)
})

describe('expenses', () => {
  it('starts empty', () => {
    expect(listExpenses(db)).toEqual([])
  })

  it('adds a show day expense', () => {
    const expense = addExpense(db, {
      date: '2026-04-17',
      show_name: 'TED Talk 2026',
      client: 'Ovation Events',
      type: 'show_day',
      hours: null,
      rate: 750,
      amount: 750,
      notes: '',
    })
    expect(expense.id).toBeDefined()
    expect(expense.show_name).toBe('TED Talk 2026')
    expect(expense.amount).toBe(750)
  })

  it('adds an hourly expense', () => {
    const expense = addExpense(db, {
      date: '2026-04-17',
      show_name: 'Rehearsal',
      client: 'CBRE',
      type: 'hourly',
      hours: 4,
      rate: 85,
      amount: 340,
      notes: 'Load-in',
    })
    expect(expense.type).toBe('hourly')
    expect(expense.hours).toBe(4)
    expect(expense.amount).toBe(340)
  })

  it('lists expenses newest first', () => {
    addExpense(db, { date: '2026-04-01', show_name: 'A', client: 'X', type: 'show_day', hours: null, rate: 700, amount: 700, notes: '' })
    addExpense(db, { date: '2026-04-17', show_name: 'B', client: 'Y', type: 'travel_day', hours: null, rate: 400, amount: 400, notes: '' })
    const list = listExpenses(db)
    expect(list[0].show_name).toBe('B')
    expect(list[1].show_name).toBe('A')
  })

  it('updates an expense', () => {
    const created = addExpense(db, { date: '2026-04-17', show_name: 'Old', client: 'X', type: 'show_day', hours: null, rate: 700, amount: 700, notes: '' })
    const updated = updateExpense(db, created.id, { date: '2026-04-18', show_name: 'New', client: 'X', type: 'show_day', hours: null, rate: 750, amount: 750, notes: 'updated' })
    expect(updated.show_name).toBe('New')
    expect(updated.amount).toBe(750)
  })

  it('deletes an expense', () => {
    const created = addExpense(db, { date: '2026-04-17', show_name: 'Del', client: 'X', type: 'show_day', hours: null, rate: 700, amount: 700, notes: '' })
    deleteExpense(db, created.id)
    expect(listExpenses(db)).toEqual([])
  })
})

describe('clients', () => {
  it('starts empty', () => {
    expect(listClients(db)).toEqual([])
  })

  it('creates a client', () => {
    const client = upsertClient(db, { name: 'Ovation Events', contact: 'Jane', email: 'jane@ovation.com', notes: '' })
    expect(client.name).toBe('Ovation Events')
    expect(client.contact).toBe('Jane')
  })

  it('upserts — updates existing client by name', () => {
    upsertClient(db, { name: 'Ovation Events', contact: 'Jane', email: 'jane@ovation.com', notes: '' })
    upsertClient(db, { name: 'Ovation Events', contact: 'Bob', email: 'bob@ovation.com', notes: 'VIP' })
    const clients = listClients(db)
    expect(clients).toHaveLength(1)
    expect(clients[0].contact).toBe('Bob')
  })

  it('lists clients alphabetically', () => {
    upsertClient(db, { name: 'Zebra Corp', contact: '', email: '', notes: '' })
    upsertClient(db, { name: 'Apple Events', contact: '', email: '', notes: '' })
    const names = listClients(db).map((c) => c.name)
    expect(names).toEqual(['Apple Events', 'Zebra Corp'])
  })

  it('deletes a client', () => {
    const client = upsertClient(db, { name: 'Gone Co', contact: '', email: '', notes: '' })
    deleteClient(db, client.id)
    expect(listClients(db)).toEqual([])
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd /Users/tomfreekinr/av-desk && npm test -- tests/main/db.expenses.test.js
```

Expected: FAIL — `Cannot find module '../../src/main/db'`

- [ ] **Step 3: Create src/main/db.js**

```js
import Database from 'better-sqlite3'
import { join } from 'path'

/**
 * initDb — run migrations on an existing Database instance.
 * Exported separately so tests can pass an in-memory DB.
 */
export function initDb(db) {
  db.pragma('journal_mode = WAL')
  db.exec(`
    CREATE TABLE IF NOT EXISTS expenses (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      date        TEXT    NOT NULL,
      show_name   TEXT    NOT NULL,
      client      TEXT    NOT NULL DEFAULT '',
      type        TEXT    NOT NULL CHECK(type IN ('travel_day','show_day','hourly')),
      hours       REAL,
      rate        REAL    NOT NULL,
      amount      REAL    NOT NULL,
      notes       TEXT    DEFAULT '',
      created_at  TEXT    DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS clients (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      name     TEXT    NOT NULL UNIQUE,
      contact  TEXT    DEFAULT '',
      email    TEXT    DEFAULT '',
      notes    TEXT    DEFAULT ''
    );
  `)
}

let _db = null

/**
 * getDb — returns the singleton DB for the main process.
 * @param {string|null} dbPath  Override path (used in tests via initDb instead).
 */
export function getDb(appGetPath) {
  if (_db) return _db
  const filePath = join(appGetPath('userData'), 'av-desk.db')
  _db = new Database(filePath)
  initDb(_db)
  return _db
}

// ── Expenses ────────────────────────────────────────────────────────────────

export function listExpenses(db) {
  return db.prepare('SELECT * FROM expenses ORDER BY date DESC, id DESC').all()
}

export function addExpense(db, { date, show_name, client, type, hours, rate, amount, notes }) {
  const stmt = db.prepare(
    `INSERT INTO expenses (date, show_name, client, type, hours, rate, amount, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  )
  const { lastInsertRowid } = stmt.run(date, show_name, client, type, hours ?? null, rate, amount, notes ?? '')
  return db.prepare('SELECT * FROM expenses WHERE id = ?').get(lastInsertRowid)
}

export function updateExpense(db, id, { date, show_name, client, type, hours, rate, amount, notes }) {
  db.prepare(
    `UPDATE expenses
     SET date=?, show_name=?, client=?, type=?, hours=?, rate=?, amount=?, notes=?
     WHERE id=?`
  ).run(date, show_name, client, type, hours ?? null, rate, amount, notes ?? '', id)
  return db.prepare('SELECT * FROM expenses WHERE id = ?').get(id)
}

export function deleteExpense(db, id) {
  db.prepare('DELETE FROM expenses WHERE id = ?').run(id)
}

// ── Clients ─────────────────────────────────────────────────────────────────

export function listClients(db) {
  return db.prepare('SELECT * FROM clients ORDER BY name ASC').all()
}

export function upsertClient(db, { name, contact, email, notes }) {
  db.prepare(
    `INSERT INTO clients (name, contact, email, notes) VALUES (?, ?, ?, ?)
     ON CONFLICT(name) DO UPDATE SET contact=excluded.contact, email=excluded.email, notes=excluded.notes`
  ).run(name, contact ?? '', email ?? '', notes ?? '')
  return db.prepare('SELECT * FROM clients WHERE name = ?').get(name)
}

export function deleteClient(db, id) {
  db.prepare('DELETE FROM clients WHERE id = ?').run(id)
}
```

- [ ] **Step 4: Run DB tests and confirm they pass**

```bash
cd /Users/tomfreekinr/av-desk && npm test -- tests/main/db.expenses.test.js
```

Expected: all 9 tests pass.

- [ ] **Step 5: Commit**

```bash
cd /Users/tomfreekinr/av-desk && git add src/main/db.js tests/main/db.expenses.test.js && git commit -m "feat: add SQLite DB layer with expenses and clients CRUD"
```

---

## Task 3: IPC handlers + preload bridge

**Files:**
- Modify: `src/main/index.js`
- Modify: `src/preload/index.js`

- [ ] **Step 1: Update src/main/index.js — add DB import and IPC handlers**

Replace the entire file:

```js
import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import Store from 'electron-store'
import { getDb, listExpenses, addExpense, updateExpense, deleteExpense, listClients, upsertClient, deleteClient } from './db'

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
      sandbox: false,
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

// IPC: Expenses
ipcMain.handle('expenses:list', () => listExpenses(getDb(app.getPath.bind(app))))
ipcMain.handle('expenses:add', (_event, data) => addExpense(getDb(app.getPath.bind(app)), data))
ipcMain.handle('expenses:update', (_event, id, data) => updateExpense(getDb(app.getPath.bind(app)), id, data))
ipcMain.handle('expenses:delete', (_event, id) => deleteExpense(getDb(app.getPath.bind(app)), id))

// IPC: Clients
ipcMain.handle('clients:list', () => listClients(getDb(app.getPath.bind(app))))
ipcMain.handle('clients:upsert', (_event, data) => upsertClient(getDb(app.getPath.bind(app)), data))
ipcMain.handle('clients:delete', (_event, id) => deleteClient(getDb(app.getPath.bind(app)), id))

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
```

- [ ] **Step 2: Update src/preload/index.js — expose expenses and clients**

Replace the entire file:

```js
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
```

- [ ] **Step 3: Run all tests to confirm nothing broke**

```bash
cd /Users/tomfreekinr/av-desk && npm test
```

Expected: all existing tests still pass (Settings, Sidebar, App, DB).

- [ ] **Step 4: Commit**

```bash
cd /Users/tomfreekinr/av-desk && git add src/main/index.js src/preload/index.js && git commit -m "feat: add expenses and clients IPC handlers and preload bridge"
```

---

## Task 4: ExpenseList component (TDD)

**Files:**
- Create: `src/renderer/src/screens/expenses/ExpenseList.jsx`
- Create: `tests/renderer/ExpenseList.test.jsx`

- [ ] **Step 1: Write the failing ExpenseList tests**

Create `tests/renderer/ExpenseList.test.jsx`:

```jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ExpenseList from '../../src/renderer/src/screens/expenses/ExpenseList'

const sampleExpenses = [
  { id: 1, date: '2026-04-17', show_name: 'TED Talk', client: 'Ovation Events', type: 'show_day', hours: null, rate: 750, amount: 750, notes: '' },
  { id: 2, date: '2026-04-16', show_name: 'Load-in', client: 'CBRE', type: 'hourly', hours: 4, rate: 85, amount: 340, notes: 'Setup' },
]

it('renders the expense table with rows', () => {
  render(<ExpenseList expenses={sampleExpenses} onEdit={vi.fn()} onDelete={vi.fn()} />)
  expect(screen.getByText('TED Talk')).toBeInTheDocument()
  expect(screen.getByText('Load-in')).toBeInTheDocument()
  expect(screen.getByText('Ovation Events')).toBeInTheDocument()
})

it('shows type labels', () => {
  render(<ExpenseList expenses={sampleExpenses} onEdit={vi.fn()} onDelete={vi.fn()} />)
  expect(screen.getByText('Show Day')).toBeInTheDocument()
  expect(screen.getByText('Hourly')).toBeInTheDocument()
})

it('shows formatted amounts', () => {
  render(<ExpenseList expenses={sampleExpenses} onEdit={vi.fn()} onDelete={vi.fn()} />)
  expect(screen.getByText('$750.00')).toBeInTheDocument()
  expect(screen.getByText('$340.00')).toBeInTheDocument()
})

it('shows total row', () => {
  render(<ExpenseList expenses={sampleExpenses} onEdit={vi.fn()} onDelete={vi.fn()} />)
  expect(screen.getByText('$1,090.00')).toBeInTheDocument()
})

it('shows empty state when no expenses', () => {
  render(<ExpenseList expenses={[]} onEdit={vi.fn()} onDelete={vi.fn()} />)
  expect(screen.getByText(/no expenses/i)).toBeInTheDocument()
})

it('calls onEdit with the expense when Edit is clicked', () => {
  const onEdit = vi.fn()
  render(<ExpenseList expenses={sampleExpenses} onEdit={onEdit} onDelete={vi.fn()} />)
  fireEvent.click(screen.getAllByText('Edit')[0])
  expect(onEdit).toHaveBeenCalledWith(sampleExpenses[0])
})

it('calls onDelete with the expense id when Delete is clicked', () => {
  const onDelete = vi.fn()
  render(<ExpenseList expenses={sampleExpenses} onEdit={vi.fn()} onDelete={onDelete} />)
  fireEvent.click(screen.getAllByText('Delete')[0])
  expect(onDelete).toHaveBeenCalledWith(1)
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd /Users/tomfreekinr/av-desk && npm test -- tests/renderer/ExpenseList.test.jsx
```

Expected: FAIL — `Cannot find module '...ExpenseList'`

- [ ] **Step 3: Create src/renderer/src/screens/expenses/ExpenseList.jsx**

```jsx
import { colors } from '../../theme'

const TYPE_LABELS = {
  travel_day: 'Travel Day',
  show_day: 'Show Day',
  hourly: 'Hourly',
}

const fmt = (n) =>
  Number(n).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })

const thStyle = {
  padding: '9px 12px',
  color: colors.textSecondary,
  fontSize: '11px',
  fontWeight: '500',
  textAlign: 'left',
  borderBottom: `1px solid ${colors.border}`,
  whiteSpace: 'nowrap',
}

const tdStyle = {
  padding: '10px 12px',
  fontSize: '13px',
  color: colors.text,
  borderBottom: `1px solid ${colors.borderLight}`,
  verticalAlign: 'middle',
}

function ActionBtn({ label, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'none',
        border: `1px solid ${danger ? colors.red : colors.border}`,
        borderRadius: '5px',
        color: danger ? colors.red : colors.textSecondary,
        fontSize: '11px',
        padding: '4px 10px',
        cursor: 'pointer',
        marginLeft: '6px',
      }}
    >
      {label}
    </button>
  )
}

export default function ExpenseList({ expenses, onEdit, onDelete }) {
  if (expenses.length === 0) {
    return (
      <div style={{ padding: '48px', textAlign: 'center', color: colors.textMuted, fontSize: '13px' }}>
        No expenses yet — click Add Expense to get started.
      </div>
    )
  }

  const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0)

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {['Date', 'Show', 'Client', 'Type', 'Hrs', 'Rate', 'Amount', ''].map((h) => (
              <th key={h} style={thStyle}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {expenses.map((exp) => (
            <tr key={exp.id}>
              <td style={tdStyle}>{exp.date}</td>
              <td style={tdStyle}>{exp.show_name}</td>
              <td style={{ ...tdStyle, color: colors.textSecondary }}>{exp.client}</td>
              <td style={tdStyle}>{TYPE_LABELS[exp.type] || exp.type}</td>
              <td style={{ ...tdStyle, color: colors.textSecondary }}>{exp.hours ?? '—'}</td>
              <td style={{ ...tdStyle, color: colors.textSecondary }}>{fmt(exp.rate)}</td>
              <td style={{ ...tdStyle, fontWeight: '500' }}>{fmt(exp.amount)}</td>
              <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                <ActionBtn label="Edit" onClick={() => onEdit(exp)} />
                <ActionBtn label="Delete" onClick={() => onDelete(exp.id)} danger />
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={6} style={{ ...tdStyle, color: colors.textSecondary, fontSize: '11px', paddingTop: '14px' }}>
              {expenses.length} {expenses.length === 1 ? 'entry' : 'entries'}
            </td>
            <td
              style={{
                ...tdStyle,
                fontWeight: '600',
                fontSize: '15px',
                paddingTop: '14px',
              }}
            >
              {fmt(total)}
            </td>
            <td style={tdStyle} />
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
```

- [ ] **Step 4: Run ExpenseList tests and confirm they pass**

```bash
cd /Users/tomfreekinr/av-desk && npm test -- tests/renderer/ExpenseList.test.jsx
```

Expected: all 7 tests pass.

- [ ] **Step 5: Commit**

```bash
cd /Users/tomfreekinr/av-desk && git add src/renderer/src/screens/expenses/ExpenseList.jsx tests/renderer/ExpenseList.test.jsx && git commit -m "feat: add ExpenseList component with totals and edit/delete actions"
```

---

## Task 5: ExpenseForm component (TDD)

**Files:**
- Create: `src/renderer/src/screens/expenses/ExpenseForm.jsx`
- Create: `tests/renderer/ExpenseForm.test.jsx`

- [ ] **Step 1: Write the failing ExpenseForm tests**

Create `tests/renderer/ExpenseForm.test.jsx`:

```jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ExpenseForm from '../../src/renderer/src/screens/expenses/ExpenseForm'

const clients = [
  { id: 1, name: 'Ovation Events', contact: 'Jane', email: 'jane@ovation.com', notes: '' },
]

it('renders all fields', () => {
  render(<ExpenseForm onSave={vi.fn()} onCancel={vi.fn()} clients={clients} defaultRates={{}} />)
  expect(screen.getByLabelText('Date')).toBeInTheDocument()
  expect(screen.getByLabelText('Show Name')).toBeInTheDocument()
  expect(screen.getByLabelText('Client')).toBeInTheDocument()
  expect(screen.getByLabelText('Type')).toBeInTheDocument()
  expect(screen.getByLabelText('Rate ($)')).toBeInTheDocument()
  expect(screen.getByLabelText('Notes')).toBeInTheDocument()
})

it('hides Hours field when type is show_day', () => {
  render(<ExpenseForm onSave={vi.fn()} onCancel={vi.fn()} clients={clients} defaultRates={{}} />)
  expect(screen.queryByLabelText('Hours')).not.toBeInTheDocument()
})

it('shows Hours field when type is hourly', () => {
  render(<ExpenseForm onSave={vi.fn()} onCancel={vi.fn()} clients={clients} defaultRates={{}} />)
  fireEvent.change(screen.getByLabelText('Type'), { target: { value: 'hourly' } })
  expect(screen.getByLabelText('Hours')).toBeInTheDocument()
})

it('auto-fills rate from defaultRates when type changes', () => {
  render(
    <ExpenseForm
      onSave={vi.fn()}
      onCancel={vi.fn()}
      clients={clients}
      defaultRates={{ travel_day: 400, show_day: 750, hourly: 85 }}
    />
  )
  // Default type is show_day
  expect(screen.getByLabelText('Rate ($)').value).toBe('750')
  fireEvent.change(screen.getByLabelText('Type'), { target: { value: 'travel_day' } })
  expect(screen.getByLabelText('Rate ($)').value).toBe('400')
})

it('auto-calculates amount for show_day (rate only)', () => {
  render(<ExpenseForm onSave={vi.fn()} onCancel={vi.fn()} clients={clients} defaultRates={{ show_day: 750 }} />)
  expect(screen.getByText('$750.00')).toBeInTheDocument()
})

it('auto-calculates amount for hourly (hours × rate)', () => {
  render(<ExpenseForm onSave={vi.fn()} onCancel={vi.fn()} clients={clients} defaultRates={{ hourly: 85 }} />)
  fireEvent.change(screen.getByLabelText('Type'), { target: { value: 'hourly' } })
  fireEvent.change(screen.getByLabelText('Hours'), { target: { value: '4' } })
  expect(screen.getByText('$340.00')).toBeInTheDocument()
})

it('calls onSave with correct data when form is submitted', async () => {
  const onSave = vi.fn()
  render(
    <ExpenseForm
      onSave={onSave}
      onCancel={vi.fn()}
      clients={clients}
      defaultRates={{ show_day: 750 }}
    />
  )
  fireEvent.change(screen.getByLabelText('Show Name'), { target: { value: 'TED Talk' } })
  fireEvent.change(screen.getByLabelText('Client'), { target: { value: 'Ovation Events' } })
  fireEvent.click(screen.getByText('Save'))
  await waitFor(() => {
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        show_name: 'TED Talk',
        client: 'Ovation Events',
        type: 'show_day',
        rate: 750,
        amount: 750,
      })
    )
  })
})

it('pre-fills fields when editing an existing expense', () => {
  const existing = { date: '2026-04-17', show_name: 'Old Show', client: 'CBRE', type: 'hourly', hours: 3, rate: 85, amount: 255, notes: 'Setup' }
  render(<ExpenseForm expense={existing} onSave={vi.fn()} onCancel={vi.fn()} clients={clients} defaultRates={{}} />)
  expect(screen.getByLabelText('Show Name').value).toBe('Old Show')
  expect(screen.getByLabelText('Hours').value).toBe('3')
})

it('calls onCancel when Cancel is clicked', () => {
  const onCancel = vi.fn()
  render(<ExpenseForm onSave={vi.fn()} onCancel={onCancel} clients={clients} defaultRates={{}} />)
  fireEvent.click(screen.getByText('Cancel'))
  expect(onCancel).toHaveBeenCalled()
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd /Users/tomfreekinr/av-desk && npm test -- tests/renderer/ExpenseForm.test.jsx
```

Expected: FAIL — `Cannot find module '...ExpenseForm'`

- [ ] **Step 3: Create src/renderer/src/screens/expenses/ExpenseForm.jsx**

```jsx
import { useState, useEffect } from 'react'
import { colors } from '../../theme'

const TYPE_OPTIONS = [
  { value: 'show_day', label: 'Show Day' },
  { value: 'travel_day', label: 'Travel Day' },
  { value: 'hourly', label: 'Hourly' },
]

const inputStyle = {
  width: '100%',
  backgroundColor: colors.card,
  border: `1px solid ${colors.border}`,
  borderRadius: '7px',
  padding: '9px 12px',
  color: colors.text,
  fontSize: '13px',
  outline: 'none',
  boxSizing: 'border-box',
}

const labelStyle = {
  display: 'block',
  color: colors.textSecondary,
  fontSize: '11px',
  textTransform: 'uppercase',
  letterSpacing: '0.8px',
  marginBottom: '5px',
}

function Field({ label, id, children }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <label htmlFor={id} style={labelStyle}>{label}</label>
      {children}
    </div>
  )
}

function calcAmount(type, rate, hours) {
  if (type === 'hourly') return (Number(hours) || 0) * (Number(rate) || 0)
  return Number(rate) || 0
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

export default function ExpenseForm({ expense, onSave, onCancel, clients, defaultRates }) {
  const [form, setForm] = useState({
    date: expense?.date ?? todayIso(),
    show_name: expense?.show_name ?? '',
    client: expense?.client ?? '',
    type: expense?.type ?? 'show_day',
    hours: expense?.hours != null ? String(expense.hours) : '',
    rate: expense?.rate != null ? String(expense.rate) : String(defaultRates?.show_day ?? ''),
    notes: expense?.notes ?? '',
  })

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))

  // When type changes, auto-fill rate from defaultRates
  useEffect(() => {
    if (!expense) {
      const newRate = defaultRates?.[form.type]
      if (newRate !== undefined) setForm((prev) => ({ ...prev, rate: String(newRate) }))
    }
  }, [form.type]) // eslint-disable-line react-hooks/exhaustive-deps

  const amount = calcAmount(form.type, form.rate, form.hours)

  const handleSave = () => {
    onSave({
      date: form.date,
      show_name: form.show_name,
      client: form.client,
      type: form.type,
      hours: form.type === 'hourly' ? (Number(form.hours) || null) : null,
      rate: Number(form.rate) || 0,
      amount,
      notes: form.notes,
    })
  }

  return (
    <div style={{ maxWidth: '480px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
        <Field label="Date" id="date">
          <input id="date" type="date" value={form.date} onChange={set('date')} style={inputStyle} />
        </Field>
        <Field label="Type" id="type">
          <select id="type" value={form.type} onChange={set('type')} style={inputStyle}>
            {TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Show Name" id="show_name">
        <input id="show_name" type="text" value={form.show_name} onChange={set('show_name')} style={inputStyle} placeholder="e.g. TED Talk 2026" list="client-list" />
      </Field>

      <Field label="Client" id="client">
        <input id="client" type="text" value={form.client} onChange={set('client')} style={inputStyle} placeholder="e.g. Ovation Events" list="client-list" />
        <datalist id="client-list">
          {clients.map((c) => <option key={c.id} value={c.name} />)}
        </datalist>
      </Field>

      <div style={{ display: 'grid', gridTemplateColumns: form.type === 'hourly' ? '1fr 1fr' : '1fr', gap: '0 16px' }}>
        {form.type === 'hourly' && (
          <Field label="Hours" id="hours">
            <input id="hours" type="number" min="0" step="0.5" value={form.hours} onChange={set('hours')} style={inputStyle} />
          </Field>
        )}
        <Field label="Rate ($)" id="rate">
          <input id="rate" type="number" min="0" step="0.01" value={form.rate} onChange={set('rate')} style={inputStyle} />
        </Field>
      </div>

      <div style={{
        backgroundColor: colors.card,
        border: `1px solid ${colors.border}`,
        borderRadius: '7px',
        padding: '12px 14px',
        marginBottom: '16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{ color: colors.textSecondary, fontSize: '12px' }}>Total</span>
        <span style={{ color: colors.text, fontSize: '18px', fontWeight: '600' }}>
          {amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
        </span>
      </div>

      <Field label="Notes" id="notes">
        <textarea
          id="notes"
          value={form.notes}
          onChange={set('notes')}
          rows={3}
          style={{ ...inputStyle, resize: 'vertical' }}
          placeholder="Optional notes..."
        />
      </Field>

      <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
        <button
          onClick={handleSave}
          style={{
            backgroundColor: colors.card,
            color: colors.text,
            border: `1px solid ${colors.border}`,
            borderRadius: '7px',
            padding: '9px 22px',
            fontSize: '13px',
            fontWeight: '500',
            cursor: 'pointer',
          }}
        >
          Save
        </button>
        <button
          onClick={onCancel}
          style={{
            background: 'none',
            color: colors.textSecondary,
            border: 'none',
            fontSize: '13px',
            cursor: 'pointer',
            padding: '9px 10px',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run ExpenseForm tests and confirm they pass**

```bash
cd /Users/tomfreekinr/av-desk && npm test -- tests/renderer/ExpenseForm.test.jsx
```

Expected: all 9 tests pass.

- [ ] **Step 5: Commit**

```bash
cd /Users/tomfreekinr/av-desk && git add src/renderer/src/screens/expenses/ExpenseForm.jsx tests/renderer/ExpenseForm.test.jsx && git commit -m "feat: add ExpenseForm with type-aware rate auto-fill and amount calculation"
```

---

## Task 6: PDF export utility

**Files:**
- Create: `src/renderer/src/screens/expenses/exportPdf.js`
- Create: `tests/renderer/exportPdf.test.js`

- [ ] **Step 1: Write the failing exportPdf tests**

Create `tests/renderer/exportPdf.test.js`:

```js
import { describe, it, expect, vi, beforeAll } from 'vitest'

// jspdf uses browser APIs — mock the parts we need
beforeAll(() => {
  // Minimal canvas mock for jspdf
  global.HTMLCanvasElement.prototype.getContext = () => ({
    fillRect: vi.fn(), clearRect: vi.fn(), getImageData: vi.fn(() => ({ data: [] })),
    setTransform: vi.fn(), drawImage: vi.fn(), save: vi.fn(), fillText: vi.fn(),
    restore: vi.fn(), beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(),
    closePath: vi.fn(), stroke: vi.fn(), translate: vi.fn(), scale: vi.fn(),
    rotate: vi.fn(), arc: vi.fn(), fill: vi.fn(), measureText: vi.fn(() => ({ width: 0 })),
    transform: vi.fn(), rect: vi.fn(), clip: vi.fn(),
  })
  global.URL.createObjectURL = vi.fn(() => 'blob:mock')
})

import { buildExpenseReport } from '../../src/renderer/src/screens/expenses/exportPdf'

const expenses = [
  { id: 1, date: '2026-04-17', show_name: 'TED Talk', client: 'Ovation Events', type: 'show_day', hours: null, rate: 750, amount: 750, notes: '' },
  { id: 2, date: '2026-04-16', show_name: 'Load-in', client: 'CBRE', type: 'hourly', hours: 4, rate: 85, amount: 340, notes: '' },
]

it('returns a jsPDF document object', () => {
  const doc = buildExpenseReport({ expenses, businessName: 'Tom AV', yourName: 'Tom' })
  expect(doc).toBeDefined()
  expect(typeof doc.save).toBe('function')
  expect(typeof doc.output).toBe('function')
})

it('does not throw with empty expenses array', () => {
  expect(() => buildExpenseReport({ expenses: [], businessName: '', yourName: '' })).not.toThrow()
})

it('does not throw with a single expense', () => {
  expect(() => buildExpenseReport({ expenses: [expenses[0]], businessName: 'Tom AV', yourName: 'Tom' })).not.toThrow()
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd /Users/tomfreekinr/av-desk && npm test -- tests/renderer/exportPdf.test.js
```

Expected: FAIL — `Cannot find module '...exportPdf'`

- [ ] **Step 3: Create src/renderer/src/screens/expenses/exportPdf.js**

```js
import jsPDF from 'jspdf'

const TYPE_LABELS = { travel_day: 'Travel', show_day: 'Show', hourly: 'Hourly' }

function trunc(str, max) {
  if (!str) return ''
  return str.length > max ? str.slice(0, max - 1) + '…' : str
}

/**
 * buildExpenseReport — builds a jsPDF document from expenses data.
 * Call doc.save('filename.pdf') or doc.output('bloburl') on the returned doc.
 *
 * @param {{ expenses: object[], businessName: string, yourName: string }} options
 * @returns {jsPDF}
 */
export function buildExpenseReport({ expenses, businessName, yourName }) {
  const doc = new jsPDF()

  // ── Header ─────────────────────────────────────────────────────────────
  doc.setFontSize(18)
  doc.setTextColor(40)
  doc.text('Expense Report', 14, 22)

  doc.setFontSize(10)
  doc.setTextColor(100)
  const nameStr = businessName || yourName || ''
  if (nameStr) doc.text(nameStr, 14, 30)

  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  doc.text(`Generated: ${today}`, 14, nameStr ? 38 : 30)

  // ── Column layout ───────────────────────────────────────────────────────
  const startY = nameStr ? 50 : 44
  const cols = [
    { label: 'Date',    x: 14,  w: 24 },
    { label: 'Show',    x: 38,  w: 52 },
    { label: 'Client',  x: 90,  w: 38 },
    { label: 'Type',    x: 128, w: 20 },
    { label: 'Hrs',     x: 148, w: 12 },
    { label: 'Rate',    x: 160, w: 22 },
    { label: 'Amount',  x: 182, w: 24 },
  ]

  // Header row
  doc.setFillColor(44, 44, 46)
  doc.rect(14, startY - 5, 192, 8, 'F')
  doc.setFontSize(8)
  doc.setTextColor(200)
  cols.forEach((col) => doc.text(col.label, col.x, startY))

  // Data rows
  let y = startY + 9
  let total = 0
  doc.setTextColor(40)

  expenses.forEach((exp, idx) => {
    if (y > 270) {
      doc.addPage()
      y = 20
    }
    if (idx % 2 === 1) {
      doc.setFillColor(245, 245, 248)
      doc.rect(14, y - 5, 192, 7, 'F')
    }
    doc.setFontSize(8)
    const typeLabel = TYPE_LABELS[exp.type] || exp.type
    const amt = Number(exp.amount)
    total += amt
    const row = [
      exp.date,
      trunc(exp.show_name, 28),
      trunc(exp.client, 20),
      typeLabel,
      exp.hours != null ? String(exp.hours) : '—',
      `$${Number(exp.rate).toFixed(2)}`,
      `$${amt.toFixed(2)}`,
    ]
    cols.forEach((col, i) => doc.text(row[i], col.x, y))
    y += 7
  })

  // Total row
  y += 4
  doc.setFillColor(44, 44, 46)
  doc.rect(14, y - 5, 192, 9, 'F')
  doc.setTextColor(200)
  doc.setFontSize(9)
  doc.text('TOTAL', 14, y)
  doc.setFontSize(10)
  doc.text(`$${total.toFixed(2)}`, 182, y)

  return doc
}
```

- [ ] **Step 4: Run exportPdf tests and confirm they pass**

```bash
cd /Users/tomfreekinr/av-desk && npm test -- tests/renderer/exportPdf.test.js
```

Expected: all 3 tests pass.

- [ ] **Step 5: Commit**

```bash
cd /Users/tomfreekinr/av-desk && git add src/renderer/src/screens/expenses/exportPdf.js tests/renderer/exportPdf.test.js && git commit -m "feat: add jspdf expense report builder"
```

---

## Task 7: Expenses.jsx main screen + integration test

**Files:**
- Modify: `src/renderer/src/screens/Expenses.jsx`
- Create: `tests/renderer/Expenses.test.jsx`

- [ ] **Step 1: Write the failing Expenses screen tests**

Create `tests/renderer/Expenses.test.jsx`:

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import Expenses from '../../src/renderer/src/screens/Expenses'

const mockExpenses = [
  { id: 1, date: '2026-04-17', show_name: 'TED Talk', client: 'Ovation Events', type: 'show_day', hours: null, rate: 750, amount: 750, notes: '' },
]

beforeEach(() => {
  window.electronAPI = {
    settings: {
      getAll: vi.fn().mockResolvedValue({ yourName: 'Tom', businessName: 'Tom AV', showDayRate: '750', travelDayRate: '400', hourlyRate: '85' }),
    },
    expenses: {
      list: vi.fn().mockResolvedValue(mockExpenses),
      add: vi.fn().mockResolvedValue({ id: 2, date: '2026-04-18', show_name: 'New Show', client: 'CBRE', type: 'show_day', hours: null, rate: 750, amount: 750, notes: '' }),
      update: vi.fn().mockResolvedValue({ ...mockExpenses[0], show_name: 'Updated' }),
      delete: vi.fn().mockResolvedValue(undefined),
    },
    clients: {
      list: vi.fn().mockResolvedValue([]),
      upsert: vi.fn().mockResolvedValue({ id: 1, name: 'Ovation Events', contact: '', email: '', notes: '' }),
    },
  }
})

it('shows expense list after loading', async () => {
  render(<Expenses />)
  await waitFor(() => {
    expect(screen.getByText('TED Talk')).toBeInTheDocument()
  })
})

it('shows Add Expense button', async () => {
  render(<Expenses />)
  await waitFor(() => expect(screen.getByText('Add Expense')).toBeInTheDocument())
})

it('shows ExpenseForm when Add Expense is clicked', async () => {
  render(<Expenses />)
  await waitFor(() => fireEvent.click(screen.getByText('Add Expense')))
  expect(screen.getByLabelText('Show Name')).toBeInTheDocument()
})

it('returns to list and calls expenses.add when form is saved', async () => {
  render(<Expenses />)
  await waitFor(() => fireEvent.click(screen.getByText('Add Expense')))
  fireEvent.change(screen.getByLabelText('Show Name'), { target: { value: 'New Show' } })
  fireEvent.change(screen.getByLabelText('Client'), { target: { value: 'CBRE' } })
  fireEvent.click(screen.getByText('Save'))
  await waitFor(() => {
    expect(window.electronAPI.expenses.add).toHaveBeenCalled()
    expect(screen.queryByLabelText('Show Name')).not.toBeInTheDocument()
  })
})

it('shows ExpenseForm pre-filled when Edit is clicked', async () => {
  render(<Expenses />)
  await waitFor(() => fireEvent.click(screen.getByText('Edit')))
  expect(screen.getByLabelText('Show Name').value).toBe('TED Talk')
})

it('calls expenses.delete when Delete is clicked', async () => {
  render(<Expenses />)
  await waitFor(() => fireEvent.click(screen.getByText('Delete')))
  await waitFor(() => expect(window.electronAPI.expenses.delete).toHaveBeenCalledWith(1))
})

it('shows Export PDF button', async () => {
  render(<Expenses />)
  await waitFor(() => expect(screen.getByText('Export PDF')).toBeInTheDocument())
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd /Users/tomfreekinr/av-desk && npm test -- tests/renderer/Expenses.test.jsx
```

Expected: FAIL — component exists but shows placeholder text, not real UI.

- [ ] **Step 3: Replace src/renderer/src/screens/Expenses.jsx with full implementation**

```jsx
import { useState, useEffect, useCallback } from 'react'
import ScreenShell from '../components/ScreenShell'
import ExpenseList from './expenses/ExpenseList'
import ExpenseForm from './expenses/ExpenseForm'
import { buildExpenseReport } from './expenses/exportPdf'
import { colors } from '../theme'

// view: 'list' | 'add' | 'edit'

export default function Expenses() {
  const [view, setView] = useState('list')
  const [expenses, setExpenses] = useState([])
  const [clients, setClients] = useState([])
  const [editTarget, setEditTarget] = useState(null)
  const [defaultRates, setDefaultRates] = useState({})

  const load = useCallback(async () => {
    const [exps, cls, settings] = await Promise.all([
      window.electronAPI.expenses.list(),
      window.electronAPI.clients.list(),
      window.electronAPI.settings.getAll(),
    ])
    setExpenses(exps)
    setClients(cls)
    setDefaultRates({
      show_day: Number(settings?.showDayRate) || 0,
      travel_day: Number(settings?.travelDayRate) || 0,
      hourly: Number(settings?.hourlyRate) || 0,
    })
  }, [])

  useEffect(() => { load() }, [load])

  const handleAdd = async (data) => {
    await window.electronAPI.expenses.add(data)
    await load()
    setView('list')
  }

  const handleEdit = (expense) => {
    setEditTarget(expense)
    setView('edit')
  }

  const handleUpdate = async (data) => {
    await window.electronAPI.expenses.update(editTarget.id, data)
    await load()
    setEditTarget(null)
    setView('list')
  }

  const handleDelete = async (id) => {
    await window.electronAPI.expenses.delete(id)
    await load()
  }

  const handleExportPdf = async () => {
    const settings = await window.electronAPI.settings.getAll()
    const doc = buildExpenseReport({
      expenses,
      businessName: settings?.businessName || '',
      yourName: settings?.yourName || '',
    })
    doc.save('expense-report.pdf')
  }

  const headerRight = view === 'list' && (
    <div style={{ display: 'flex', gap: '8px' }}>
      <Btn onClick={() => setView('add')}>Add Expense</Btn>
      {expenses.length > 0 && <Btn onClick={handleExportPdf} secondary>Export PDF</Btn>}
    </div>
  )

  const titles = { list: 'Expenses', add: 'Add Expense', edit: 'Edit Expense' }

  return (
    <ScreenShell
      title={titles[view]}
      subtitle={view === 'list' ? 'Track your AV gig expenses' : undefined}
      headerRight={headerRight}
    >
      {view === 'list' && (
        <ExpenseList expenses={expenses} onEdit={handleEdit} onDelete={handleDelete} />
      )}
      {view === 'add' && (
        <ExpenseForm
          onSave={handleAdd}
          onCancel={() => setView('list')}
          clients={clients}
          defaultRates={defaultRates}
        />
      )}
      {view === 'edit' && (
        <ExpenseForm
          expense={editTarget}
          onSave={handleUpdate}
          onCancel={() => { setEditTarget(null); setView('list') }}
          clients={clients}
          defaultRates={defaultRates}
        />
      )}
    </ScreenShell>
  )
}

function Btn({ children, onClick, secondary }) {
  return (
    <button
      onClick={onClick}
      style={{
        backgroundColor: secondary ? 'transparent' : colors.card,
        color: secondary ? colors.textSecondary : colors.text,
        border: `1px solid ${secondary ? colors.border : colors.border}`,
        borderRadius: '7px',
        padding: '7px 16px',
        fontSize: '12px',
        fontWeight: '500',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  )
}
```

- [ ] **Step 4: Update ScreenShell to accept and render headerRight prop**

Read `src/renderer/src/components/ScreenShell.jsx` — it currently renders `title` and `subtitle` only. Add `headerRight` to the header row.

Replace `src/renderer/src/components/ScreenShell.jsx`:

```jsx
import { colors } from '../theme'

export default function ScreenShell({ title, subtitle, children, headerRight }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{
        padding: '14px 22px',
        borderBottom: `1px solid ${colors.borderLight}`,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ color: colors.text, fontSize: '16px', fontWeight: '600' }}>{title}</div>
          {subtitle && (
            <div style={{ color: colors.textMuted, fontSize: '11px', marginTop: '2px' }}>{subtitle}</div>
          )}
        </div>
        {headerRight && <div>{headerRight}</div>}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px' }}>
        {children}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Run Expenses screen tests and confirm they pass**

```bash
cd /Users/tomfreekinr/av-desk && npm test -- tests/renderer/Expenses.test.jsx
```

Expected: all 7 tests pass.

- [ ] **Step 6: Run the full test suite**

```bash
cd /Users/tomfreekinr/av-desk && npm test
```

Expected: all tests pass (DB, ExpenseList, ExpenseForm, exportPdf, Expenses, Settings, Sidebar, App).

- [ ] **Step 7: Commit**

```bash
cd /Users/tomfreekinr/av-desk && git add src/renderer/src/screens/Expenses.jsx src/renderer/src/components/ScreenShell.jsx tests/renderer/Expenses.test.jsx && git commit -m "feat: complete Expenses screen — list, add, edit, delete, PDF export"
```

---

## Spec Coverage Self-Review

| Requirement | Covered by |
|-------------|------------|
| Gig tracking (add/edit/delete) | Tasks 2, 4, 5, 7 |
| Client form templates (Ovation Events) | Task 3 (clients IPC), Task 5 (autocomplete datalist) |
| PDF export | Task 6, Task 7 |
| Persisted to disk (SQLite) | Task 2 |
| Settings rate auto-fill | Task 5, Task 7 |
| Gmail OAuth receipt import | **Deferred** — complexity warrants its own plan |

Gmail OAuth is deferred. Everything else is covered.
