# Plan 3: Invoices Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full Invoices screen — create/edit/delete proforma invoices with dynamic line items (show days, travel days, hourly), status tracking (draft/sent/paid), and per-invoice PDF export.

**Architecture:** Invoices stored in SQLite with line items serialized as JSON in an `items` column (simple, no joins, appropriate for single-user desktop). CRUD functions added to the existing `src/main/db.js`, IPC handlers added to `src/main/index.js`, renderer calls `window.electronAPI.invoices.*`. The Invoices screen uses the same view-state machine pattern (`list` | `add` | `edit`) as Expenses. PDF export uses jsPDF (already installed).

**Tech Stack:** better-sqlite3, Electron IPC, jsPDF (already installed), React 19, Vitest

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/main/db.js` | Modify | Add `invoices` table to migration + 6 CRUD functions |
| `src/main/index.js` | Modify | Add 5 invoices IPC handlers |
| `src/preload/index.js` | Modify | Expose `electronAPI.invoices` |
| `src/renderer/src/screens/Invoices.jsx` | Modify | Replace placeholder with view-state machine |
| `src/renderer/src/screens/invoices/InvoiceList.jsx` | Create | Table with status badges, computed totals, PDF/edit/delete per row |
| `src/renderer/src/screens/invoices/InvoiceForm.jsx` | Create | Add/edit form with dynamic line items, auto-calculated amounts |
| `src/renderer/src/screens/invoices/invoicePdf.js` | Create | jsPDF professional invoice builder |
| `tests/main/db.invoices.test.js` | Create | DB CRUD unit tests (Node env) |
| `tests/renderer/InvoiceList.test.jsx` | Create | List component tests |
| `tests/renderer/InvoiceForm.test.jsx` | Create | Form component tests |
| `tests/renderer/invoicePdf.test.js` | Create | PDF builder smoke tests |
| `tests/renderer/Invoices.test.jsx` | Create | Screen integration tests |
| `tests/renderer/App.test.jsx` | Modify | Add invoices mock to beforeEach |

---

## Data Shape

**Invoice row (SQLite):**
```
id, invoice_number (unique, e.g. "INV-001"), date, client, status ('draft'|'sent'|'paid'),
items (JSON text), notes, created_at
```

**Line item (in JSON array):**
```json
{ "description": "TED Talk", "type": "show_day", "quantity": 1, "rate": 750, "amount": 750 }
```
`amount = quantity × rate` always.

---

## Task 1: DB layer — invoices table + CRUD (TDD)

**Files:**
- Modify: `src/main/db.js`
- Create: `tests/main/db.invoices.test.js`

- [ ] **Step 1: Write the failing DB tests**

Create `tests/main/db.invoices.test.js`:

```js
// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import {
  initDb,
  listInvoices,
  getInvoice,
  addInvoice,
  updateInvoice,
  deleteInvoice,
  getNextInvoiceNumber,
} from '../../src/main/db'

let db

beforeEach(() => {
  db = new Database(':memory:')
  initDb(db)
})

const sample = {
  invoice_number: 'INV-001',
  date: '2026-04-17',
  client: 'Ovation Events',
  status: 'draft',
  items: [
    { description: 'TED Talk', type: 'show_day', quantity: 1, rate: 750, amount: 750 },
    { description: 'Load-in', type: 'travel_day', quantity: 1, rate: 400, amount: 400 },
  ],
  notes: 'Thank you!',
}

describe('invoices', () => {
  it('starts empty', () => {
    expect(listInvoices(db)).toEqual([])
  })

  it('adds an invoice and returns it with parsed items', () => {
    const inv = addInvoice(db, sample)
    expect(inv.id).toBeDefined()
    expect(inv.invoice_number).toBe('INV-001')
    expect(inv.client).toBe('Ovation Events')
    expect(Array.isArray(inv.items)).toBe(true)
    expect(inv.items).toHaveLength(2)
    expect(inv.items[0].amount).toBe(750)
  })

  it('lists invoices newest first', () => {
    addInvoice(db, { ...sample, invoice_number: 'INV-001', date: '2026-04-01' })
    addInvoice(db, { ...sample, invoice_number: 'INV-002', date: '2026-04-17' })
    const list = listInvoices(db)
    expect(list[0].invoice_number).toBe('INV-002')
    expect(list[1].invoice_number).toBe('INV-001')
  })

  it('gets a single invoice by id', () => {
    const created = addInvoice(db, sample)
    const fetched = getInvoice(db, created.id)
    expect(fetched.invoice_number).toBe('INV-001')
    expect(Array.isArray(fetched.items)).toBe(true)
  })

  it('returns null for a missing invoice id', () => {
    expect(getInvoice(db, 9999)).toBeNull()
  })

  it('updates an invoice', () => {
    const created = addInvoice(db, sample)
    const updated = updateInvoice(db, created.id, {
      date: '2026-04-18',
      client: 'CBRE',
      status: 'sent',
      items: [{ description: 'Updated', type: 'show_day', quantity: 1, rate: 800, amount: 800 }],
      notes: 'Updated notes',
    })
    expect(updated.client).toBe('CBRE')
    expect(updated.status).toBe('sent')
    expect(updated.items[0].description).toBe('Updated')
  })

  it('deletes an invoice', () => {
    const created = addInvoice(db, sample)
    deleteInvoice(db, created.id)
    expect(listInvoices(db)).toEqual([])
  })

  it('generates sequential invoice numbers', () => {
    expect(getNextInvoiceNumber(db)).toBe('INV-001')
    addInvoice(db, sample)
    expect(getNextInvoiceNumber(db)).toBe('INV-002')
  })

  it('pads invoice numbers to 3 digits', () => {
    expect(getNextInvoiceNumber(db)).toBe('INV-001')
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd /Users/tomfreekinr/av-desk && npm test -- tests/main/db.invoices.test.js
```

Expected: FAIL — functions not exported from `src/main/db`

- [ ] **Step 3: Add invoices table to migration in src/main/db.js**

In `initDb`, change the `db.exec(...)` call to include the new table. Replace the entire `initDb` function:

```js
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
    CREATE TABLE IF NOT EXISTS invoices (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number TEXT    NOT NULL UNIQUE,
      date           TEXT    NOT NULL,
      client         TEXT    NOT NULL DEFAULT '',
      status         TEXT    NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','sent','paid')),
      items          TEXT    NOT NULL DEFAULT '[]',
      notes          TEXT    DEFAULT '',
      created_at     TEXT    DEFAULT (datetime('now'))
    );
  `)
}
```

- [ ] **Step 4: Add invoice CRUD functions to src/main/db.js**

Append these functions after the existing `deleteClient` function:

```js
// ── Invoices ─────────────────────────────────────────────────────────────────

function parseInvoice(inv) {
  return { ...inv, items: JSON.parse(inv.items || '[]') }
}

export function listInvoices(db) {
  return db.prepare('SELECT * FROM invoices ORDER BY date DESC, id DESC').all().map(parseInvoice)
}

export function getInvoice(db, id) {
  const inv = db.prepare('SELECT * FROM invoices WHERE id = ?').get(id)
  return inv ? parseInvoice(inv) : null
}

export function addInvoice(db, { invoice_number, date, client, status, items, notes }) {
  const { lastInsertRowid } = db.prepare(
    `INSERT INTO invoices (invoice_number, date, client, status, items, notes)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(invoice_number, date, client, status ?? 'draft', JSON.stringify(items ?? []), notes ?? '')
  return getInvoice(db, lastInsertRowid)
}

export function updateInvoice(db, id, { date, client, status, items, notes }) {
  db.prepare(
    `UPDATE invoices SET date=?, client=?, status=?, items=?, notes=? WHERE id=?`
  ).run(date, client, status, JSON.stringify(items ?? []), notes ?? '', id)
  return getInvoice(db, id)
}

export function deleteInvoice(db, id) {
  db.prepare('DELETE FROM invoices WHERE id = ?').run(id)
}

export function getNextInvoiceNumber(db) {
  const { count } = db.prepare('SELECT COUNT(*) as count FROM invoices').get()
  return `INV-${String(count + 1).padStart(3, '0')}`
}
```

- [ ] **Step 5: Run DB tests and confirm they pass**

```bash
cd /Users/tomfreekinr/av-desk && npm test -- tests/main/db.invoices.test.js
```

Expected: all 8 tests pass.

- [ ] **Step 6: Run full suite to confirm nothing broke**

```bash
cd /Users/tomfreekinr/av-desk && npm test
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
cd /Users/tomfreekinr/av-desk && git add src/main/db.js tests/main/db.invoices.test.js && git commit -m "feat: add invoices table and CRUD to DB layer"
```

---

## Task 2: IPC handlers + preload bridge

**Files:**
- Modify: `src/main/index.js`
- Modify: `src/preload/index.js`

- [ ] **Step 1: Update src/main/index.js — add invoice imports and handlers**

Replace the import block at the top and add IPC handlers. Full updated file:

```js
import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import Store from 'electron-store'
import {
  getDb,
  listExpenses,
  addExpense,
  updateExpense,
  deleteExpense,
  listClients,
  upsertClient,
  deleteClient,
  listInvoices,
  getNextInvoiceNumber,
  addInvoice,
  updateInvoice,
  deleteInvoice,
} from './db'

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

// IPC: Invoices
ipcMain.handle('invoices:list', () => listInvoices(getDb(app.getPath.bind(app))))
ipcMain.handle('invoices:nextNumber', () => getNextInvoiceNumber(getDb(app.getPath.bind(app))))
ipcMain.handle('invoices:add', (_event, data) => addInvoice(getDb(app.getPath.bind(app)), data))
ipcMain.handle('invoices:update', (_event, id, data) => updateInvoice(getDb(app.getPath.bind(app)), id, data))
ipcMain.handle('invoices:delete', (_event, id) => deleteInvoice(getDb(app.getPath.bind(app)), id))

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
```

- [ ] **Step 2: Update src/preload/index.js — add invoices bridge**

Full updated file:

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
  invoices: {
    list: () => ipcRenderer.invoke('invoices:list'),
    nextNumber: () => ipcRenderer.invoke('invoices:nextNumber'),
    add: (data) => ipcRenderer.invoke('invoices:add', data),
    update: (id, data) => ipcRenderer.invoke('invoices:update', id, data),
    delete: (id) => ipcRenderer.invoke('invoices:delete', id),
  },
})
```

- [ ] **Step 3: Run full test suite to confirm nothing broke**

```bash
cd /Users/tomfreekinr/av-desk && npm test
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
cd /Users/tomfreekinr/av-desk && git add src/main/index.js src/preload/index.js && git commit -m "feat: add invoices IPC handlers and preload bridge"
```

---

## Task 3: InvoiceList component (TDD)

**Files:**
- Create: `src/renderer/src/screens/invoices/InvoiceList.jsx`
- Create: `tests/renderer/InvoiceList.test.jsx`

- [ ] **Step 1: Write the failing InvoiceList tests**

Create `tests/renderer/InvoiceList.test.jsx`:

```jsx
import { it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import InvoiceList from '../../src/renderer/src/screens/invoices/InvoiceList'

const sampleInvoices = [
  {
    id: 1,
    invoice_number: 'INV-001',
    date: '2026-04-17',
    client: 'Ovation Events',
    status: 'draft',
    items: [
      { description: 'Show Day', type: 'show_day', quantity: 1, rate: 750, amount: 750 },
      { description: 'Travel', type: 'travel_day', quantity: 1, rate: 400, amount: 400 },
    ],
    notes: '',
  },
  {
    id: 2,
    invoice_number: 'INV-002',
    date: '2026-04-16',
    client: 'CBRE',
    status: 'paid',
    items: [{ description: 'Load-in', type: 'hourly', quantity: 4, rate: 85, amount: 340 }],
    notes: '',
  },
]

it('renders invoice rows', () => {
  render(<InvoiceList invoices={sampleInvoices} onEdit={vi.fn()} onDelete={vi.fn()} onExportPdf={vi.fn()} />)
  expect(screen.getByText('INV-001')).toBeInTheDocument()
  expect(screen.getByText('INV-002')).toBeInTheDocument()
  expect(screen.getByText('Ovation Events')).toBeInTheDocument()
})

it('shows computed totals from items', () => {
  render(<InvoiceList invoices={sampleInvoices} onEdit={vi.fn()} onDelete={vi.fn()} onExportPdf={vi.fn()} />)
  expect(screen.getByText('$1,150.00')).toBeInTheDocument()
  expect(screen.getByText('$340.00')).toBeInTheDocument()
})

it('shows status badges', () => {
  render(<InvoiceList invoices={sampleInvoices} onEdit={vi.fn()} onDelete={vi.fn()} onExportPdf={vi.fn()} />)
  expect(screen.getByText('draft')).toBeInTheDocument()
  expect(screen.getByText('paid')).toBeInTheDocument()
})

it('shows empty state when no invoices', () => {
  render(<InvoiceList invoices={[]} onEdit={vi.fn()} onDelete={vi.fn()} onExportPdf={vi.fn()} />)
  expect(screen.getByText(/no invoices/i)).toBeInTheDocument()
})

it('calls onEdit with invoice when Edit clicked', () => {
  const onEdit = vi.fn()
  render(<InvoiceList invoices={sampleInvoices} onEdit={onEdit} onDelete={vi.fn()} onExportPdf={vi.fn()} />)
  fireEvent.click(screen.getAllByText('Edit')[0])
  expect(onEdit).toHaveBeenCalledWith(sampleInvoices[0])
})

it('calls onDelete with id when Delete clicked', () => {
  const onDelete = vi.fn()
  render(<InvoiceList invoices={sampleInvoices} onEdit={vi.fn()} onDelete={onDelete} onExportPdf={vi.fn()} />)
  fireEvent.click(screen.getAllByText('Delete')[0])
  expect(onDelete).toHaveBeenCalledWith(1)
})

it('calls onExportPdf with invoice when PDF clicked', () => {
  const onExportPdf = vi.fn()
  render(<InvoiceList invoices={sampleInvoices} onEdit={vi.fn()} onDelete={vi.fn()} onExportPdf={onExportPdf} />)
  fireEvent.click(screen.getAllByText('PDF')[0])
  expect(onExportPdf).toHaveBeenCalledWith(sampleInvoices[0])
})
```

- [ ] **Step 2: Run to confirm fail**

```bash
cd /Users/tomfreekinr/av-desk && npm test -- tests/renderer/InvoiceList.test.jsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create src/renderer/src/screens/invoices/InvoiceList.jsx**

```jsx
import { colors } from '../../theme'

const STATUS_COLORS = {
  draft:  { color: colors.orange, bg: colors.orangeBg },
  sent:   { color: colors.blue,   bg: colors.blueBg   },
  paid:   { color: colors.green,  bg: colors.greenBg  },
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

function StatusBadge({ status }) {
  const c = STATUS_COLORS[status] || STATUS_COLORS.draft
  return (
    <span style={{
      display: 'inline-block',
      backgroundColor: c.bg,
      color: c.color,
      fontSize: '10px',
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      padding: '3px 8px',
      borderRadius: '4px',
    }}>
      {status}
    </span>
  )
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

export default function InvoiceList({ invoices, onEdit, onDelete, onExportPdf }) {
  if (invoices.length === 0) {
    return (
      <div style={{ padding: '48px', textAlign: 'center', color: colors.textMuted, fontSize: '13px' }}>
        No invoices yet — click New Invoice to get started.
      </div>
    )
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {['Invoice #', 'Client', 'Date', 'Status', 'Total', ''].map((h) => (
              <th key={h} style={thStyle}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv) => {
            const total = inv.items.reduce((sum, i) => sum + Number(i.amount), 0)
            return (
              <tr key={inv.id}>
                <td style={{ ...tdStyle, fontWeight: '500', fontVariantNumeric: 'tabular-nums' }}>{inv.invoice_number}</td>
                <td style={tdStyle}>{inv.client}</td>
                <td style={{ ...tdStyle, color: colors.textSecondary }}>{inv.date}</td>
                <td style={tdStyle}><StatusBadge status={inv.status} /></td>
                <td style={{ ...tdStyle, fontWeight: '500' }}>{fmt(total)}</td>
                <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                  <ActionBtn label="Edit" onClick={() => onEdit(inv)} />
                  <ActionBtn label="PDF" onClick={() => onExportPdf(inv)} />
                  <ActionBtn label="Delete" onClick={() => onDelete(inv.id)} danger />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 4: Run tests and confirm they pass**

```bash
cd /Users/tomfreekinr/av-desk && npm test -- tests/renderer/InvoiceList.test.jsx
```

Expected: all 7 tests pass.

- [ ] **Step 5: Commit**

```bash
cd /Users/tomfreekinr/av-desk && git add src/renderer/src/screens/invoices/InvoiceList.jsx tests/renderer/InvoiceList.test.jsx && git commit -m "feat: add InvoiceList component with status badges and computed totals"
```

---

## Task 4: InvoiceForm component (TDD)

**Files:**
- Create: `src/renderer/src/screens/invoices/InvoiceForm.jsx`
- Create: `tests/renderer/InvoiceForm.test.jsx`

- [ ] **Step 1: Write the failing InvoiceForm tests**

Create `tests/renderer/InvoiceForm.test.jsx`:

```jsx
import { it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import InvoiceForm from '../../src/renderer/src/screens/invoices/InvoiceForm'

const clients = [{ id: 1, name: 'Ovation Events', contact: '', email: '', notes: '' }]
const defaultRates = { show_day: 750, travel_day: 400, hourly: 85 }

it('renders core fields', () => {
  render(<InvoiceForm invoiceNumber="INV-001" onSave={vi.fn()} onCancel={vi.fn()} clients={clients} defaultRates={defaultRates} />)
  expect(screen.getByLabelText('Invoice #')).toBeInTheDocument()
  expect(screen.getByLabelText('Date')).toBeInTheDocument()
  expect(screen.getByLabelText('Client')).toBeInTheDocument()
  expect(screen.getByLabelText('Status')).toBeInTheDocument()
  expect(screen.getByLabelText('Notes')).toBeInTheDocument()
})

it('pre-fills invoice number as read-only', () => {
  render(<InvoiceForm invoiceNumber="INV-003" onSave={vi.fn()} onCancel={vi.fn()} clients={clients} defaultRates={defaultRates} />)
  expect(screen.getByLabelText('Invoice #').value).toBe('INV-003')
  expect(screen.getByLabelText('Invoice #')).toHaveAttribute('readonly')
})

it('renders at least one line item row', () => {
  render(<InvoiceForm invoiceNumber="INV-001" onSave={vi.fn()} onCancel={vi.fn()} clients={clients} defaultRates={defaultRates} />)
  expect(screen.getByLabelText('item-0-description')).toBeInTheDocument()
})

it('adds a new line item row when Add Line Item clicked', () => {
  render(<InvoiceForm invoiceNumber="INV-001" onSave={vi.fn()} onCancel={vi.fn()} clients={clients} defaultRates={defaultRates} />)
  fireEvent.click(screen.getByText('+ Add Line Item'))
  expect(screen.getByLabelText('item-1-description')).toBeInTheDocument()
})

it('removes a line item when × clicked (only when >1 items)', () => {
  render(<InvoiceForm invoiceNumber="INV-001" onSave={vi.fn()} onCancel={vi.fn()} clients={clients} defaultRates={defaultRates} />)
  fireEvent.click(screen.getByText('+ Add Line Item'))
  expect(screen.getByLabelText('item-1-description')).toBeInTheDocument()
  fireEvent.click(screen.getByLabelText('remove-item-1'))
  expect(screen.queryByLabelText('item-1-description')).not.toBeInTheDocument()
})

it('auto-calculates item amount from quantity × rate', () => {
  render(<InvoiceForm invoiceNumber="INV-001" onSave={vi.fn()} onCancel={vi.fn()} clients={clients} defaultRates={defaultRates} />)
  fireEvent.change(screen.getByLabelText('item-0-quantity'), { target: { value: '2' } })
  // show_day default rate is 750, qty 2 → $1,500
  expect(screen.getByText('$1,500.00')).toBeInTheDocument()
})

it('calls onSave with correct shape', async () => {
  const onSave = vi.fn()
  render(<InvoiceForm invoiceNumber="INV-001" onSave={onSave} onCancel={vi.fn()} clients={clients} defaultRates={defaultRates} />)
  fireEvent.change(screen.getByLabelText('Client'), { target: { value: 'Ovation Events' } })
  fireEvent.click(screen.getByText('Save'))
  await waitFor(() => {
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        invoice_number: 'INV-001',
        client: 'Ovation Events',
        status: 'draft',
        items: expect.arrayContaining([
          expect.objectContaining({ type: 'show_day', rate: 750 }),
        ]),
      })
    )
  })
})

it('pre-fills all fields when editing an existing invoice', () => {
  const existing = {
    invoice_number: 'INV-002',
    date: '2026-04-17',
    client: 'CBRE',
    status: 'sent',
    items: [{ description: 'Load-in', type: 'hourly', quantity: 4, rate: 85, amount: 340 }],
    notes: 'Net 30',
  }
  render(<InvoiceForm invoice={existing} onSave={vi.fn()} onCancel={vi.fn()} clients={clients} defaultRates={defaultRates} />)
  expect(screen.getByLabelText('Client').value).toBe('CBRE')
  expect(screen.getByLabelText('Status').value).toBe('sent')
  expect(screen.getByLabelText('item-0-description').value).toBe('Load-in')
})

it('calls onCancel when Cancel clicked', () => {
  const onCancel = vi.fn()
  render(<InvoiceForm invoiceNumber="INV-001" onSave={vi.fn()} onCancel={onCancel} clients={clients} defaultRates={defaultRates} />)
  fireEvent.click(screen.getByText('Cancel'))
  expect(onCancel).toHaveBeenCalled()
})
```

- [ ] **Step 2: Run to confirm fail**

```bash
cd /Users/tomfreekinr/av-desk && npm test -- tests/renderer/InvoiceForm.test.jsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create src/renderer/src/screens/invoices/InvoiceForm.jsx**

```jsx
import { useState } from 'react'
import { colors } from '../../theme'

const TYPE_OPTIONS = [
  { value: 'show_day',   label: 'Show Day'   },
  { value: 'travel_day', label: 'Travel Day' },
  { value: 'hourly',     label: 'Hourly'     },
]

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'sent',  label: 'Sent'  },
  { value: 'paid',  label: 'Paid'  },
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

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function defaultItem(defaultRates, type = 'show_day') {
  const rate = Number(defaultRates?.[type]) || 0
  return { description: '', type, quantity: 1, rate, amount: rate }
}

function recalc(item) {
  return { ...item, amount: (Number(item.quantity) || 0) * (Number(item.rate) || 0) }
}

export default function InvoiceForm({ invoice, invoiceNumber, onSave, onCancel, clients, defaultRates }) {
  const [form, setForm] = useState({
    invoice_number: invoice?.invoice_number ?? invoiceNumber ?? '',
    date: invoice?.date ?? todayIso(),
    client: invoice?.client ?? '',
    status: invoice?.status ?? 'draft',
    notes: invoice?.notes ?? '',
  })

  const [items, setItems] = useState(
    invoice?.items?.length ? invoice.items : [defaultItem(defaultRates)]
  )

  const setField = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))

  const updateItem = (idx, key, value) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== idx) return item
        const next = { ...item, [key]: value }
        if (key === 'type' && !invoice) {
          next.rate = Number(defaultRates?.[value]) || next.rate
        }
        return recalc(next)
      })
    )
  }

  const addItem = () => setItems((prev) => [...prev, defaultItem(defaultRates)])

  const removeItem = (idx) => setItems((prev) => prev.filter((_, i) => i !== idx))

  const total = items.reduce((sum, i) => sum + Number(i.amount), 0)

  const fmt = (n) =>
    Number(n).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })

  const handleSave = () => onSave({ ...form, items })

  return (
    <div style={{ maxWidth: '680px' }}>
      {/* Top meta row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 16px' }}>
        <Field label="Invoice #" id="invoice_number">
          <input
            id="invoice_number"
            type="text"
            value={form.invoice_number}
            readOnly
            style={{ ...inputStyle, color: colors.textSecondary }}
          />
        </Field>
        <Field label="Date" id="date">
          <input id="date" type="date" value={form.date} onChange={setField('date')} style={inputStyle} />
        </Field>
        <Field label="Status" id="status">
          <select id="status" value={form.status} onChange={setField('status')} style={inputStyle}>
            {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>
      </div>

      <Field label="Client" id="client">
        <input
          id="client"
          type="text"
          value={form.client}
          onChange={setField('client')}
          style={inputStyle}
          placeholder="e.g. Ovation Events"
          list="invoice-client-list"
        />
        <datalist id="invoice-client-list">
          {clients.map((c) => <option key={c.id} value={c.name} />)}
        </datalist>
      </Field>

      {/* Line items */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ ...labelStyle, marginBottom: '8px' }}>Line Items</div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Description', 'Type', 'Qty', 'Rate', 'Amount', ''].map((h) => (
                <th key={h} style={{ ...labelStyle, padding: '0 6px 6px 0', textAlign: 'left', marginBottom: 0 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx}>
                <td style={{ paddingRight: '8px', paddingBottom: '8px' }}>
                  <input
                    aria-label={`item-${idx}-description`}
                    type="text"
                    value={item.description}
                    onChange={(e) => updateItem(idx, 'description', e.target.value)}
                    style={{ ...inputStyle, minWidth: '150px' }}
                    placeholder="e.g. TED Talk"
                  />
                </td>
                <td style={{ paddingRight: '8px', paddingBottom: '8px' }}>
                  <select
                    aria-label={`item-${idx}-type`}
                    value={item.type}
                    onChange={(e) => updateItem(idx, 'type', e.target.value)}
                    style={{ ...inputStyle, minWidth: '100px' }}
                  >
                    {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </td>
                <td style={{ paddingRight: '8px', paddingBottom: '8px' }}>
                  <input
                    aria-label={`item-${idx}-quantity`}
                    type="number"
                    min="0"
                    step="0.5"
                    value={item.quantity}
                    onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                    style={{ ...inputStyle, width: '60px' }}
                  />
                </td>
                <td style={{ paddingRight: '8px', paddingBottom: '8px' }}>
                  <input
                    aria-label={`item-${idx}-rate`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.rate}
                    onChange={(e) => updateItem(idx, 'rate', e.target.value)}
                    style={{ ...inputStyle, width: '80px' }}
                  />
                </td>
                <td style={{ paddingRight: '8px', paddingBottom: '8px', color: colors.text, fontSize: '13px', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                  {fmt(item.amount)}
                </td>
                <td style={{ paddingBottom: '8px', verticalAlign: 'middle' }}>
                  {items.length > 1 && (
                    <button
                      onClick={() => removeItem(idx)}
                      aria-label={`remove-item-${idx}`}
                      style={{ background: 'none', border: 'none', color: colors.red, cursor: 'pointer', fontSize: '18px', lineHeight: 1, padding: '0 4px' }}
                    >
                      ×
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button
          onClick={addItem}
          style={{
            background: 'none',
            border: `1px dashed ${colors.border}`,
            borderRadius: '6px',
            color: colors.textSecondary,
            fontSize: '12px',
            padding: '6px 14px',
            cursor: 'pointer',
            marginTop: '4px',
          }}
        >
          + Add Line Item
        </button>
      </div>

      {/* Total */}
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
        <span style={{ color: colors.text, fontSize: '20px', fontWeight: '600' }}>{fmt(total)}</span>
      </div>

      <Field label="Notes" id="notes">
        <textarea
          id="notes"
          value={form.notes}
          onChange={setField('notes')}
          rows={3}
          style={{ ...inputStyle, resize: 'vertical' }}
          placeholder="Payment terms, thank you note..."
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
          style={{ background: 'none', color: colors.textSecondary, border: 'none', fontSize: '13px', cursor: 'pointer', padding: '9px 10px' }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests and confirm they pass**

```bash
cd /Users/tomfreekinr/av-desk && npm test -- tests/renderer/InvoiceForm.test.jsx
```

Expected: all 9 tests pass.

- [ ] **Step 5: Commit**

```bash
cd /Users/tomfreekinr/av-desk && git add src/renderer/src/screens/invoices/InvoiceForm.jsx tests/renderer/InvoiceForm.test.jsx && git commit -m "feat: add InvoiceForm with dynamic line items and auto-calculated totals"
```

---

## Task 5: invoicePdf utility (TDD)

**Files:**
- Create: `src/renderer/src/screens/invoices/invoicePdf.js`
- Create: `tests/renderer/invoicePdf.test.js`

- [ ] **Step 1: Write the failing tests**

Create `tests/renderer/invoicePdf.test.js`:

```js
import { it, expect, vi, beforeAll } from 'vitest'

beforeAll(() => {
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

import { buildInvoicePdf } from '../../src/renderer/src/screens/invoices/invoicePdf'

const invoice = {
  invoice_number: 'INV-001',
  date: '2026-04-17',
  client: 'Ovation Events',
  status: 'draft',
  items: [
    { description: 'TED Talk', type: 'show_day', quantity: 1, rate: 750, amount: 750 },
    { description: 'Load-in', type: 'travel_day', quantity: 1, rate: 400, amount: 400 },
  ],
  notes: 'Net 30',
}

it('returns a jsPDF document', () => {
  const doc = buildInvoicePdf({ invoice, businessName: 'Tom AV', yourName: 'Tom' })
  expect(doc).toBeDefined()
  expect(typeof doc.save).toBe('function')
  expect(typeof doc.output).toBe('function')
})

it('does not throw with empty items array', () => {
  expect(() =>
    buildInvoicePdf({ invoice: { ...invoice, items: [] }, businessName: '', yourName: '' })
  ).not.toThrow()
})

it('does not throw for paid status', () => {
  expect(() =>
    buildInvoicePdf({ invoice: { ...invoice, status: 'paid' }, businessName: 'Tom AV', yourName: 'Tom' })
  ).not.toThrow()
})

it('does not throw with no notes', () => {
  expect(() =>
    buildInvoicePdf({ invoice: { ...invoice, notes: '' }, businessName: 'Tom AV', yourName: 'Tom' })
  ).not.toThrow()
})

it('does not throw with no business name', () => {
  expect(() =>
    buildInvoicePdf({ invoice, businessName: '', yourName: '' })
  ).not.toThrow()
})
```

- [ ] **Step 2: Run to confirm fail**

```bash
cd /Users/tomfreekinr/av-desk && npm test -- tests/renderer/invoicePdf.test.js
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create src/renderer/src/screens/invoices/invoicePdf.js**

```js
import jsPDF from 'jspdf'

const TYPE_LABELS = { show_day: 'Show Day', travel_day: 'Travel Day', hourly: 'Hourly' }

/**
 * buildInvoicePdf — builds a professional jsPDF invoice document.
 * Call doc.save('INV-001.pdf') on the returned doc.
 *
 * @param {{ invoice: object, businessName: string, yourName: string }} options
 * @returns {jsPDF}
 */
export function buildInvoicePdf({ invoice, businessName, yourName }) {
  const doc = new jsPDF()
  const { invoice_number, date, client, status, items, notes } = invoice
  const total = items.reduce((sum, i) => sum + Number(i.amount), 0)

  // ── Header ────────────────────────────────────────────────────────────────
  doc.setFontSize(24)
  doc.setTextColor(40)
  doc.text('INVOICE', 14, 26)

  // Status watermark for draft/paid
  if (status === 'draft') {
    doc.setFontSize(9)
    doc.setTextColor(150)
    doc.text('DRAFT', 56, 20)
  } else if (status === 'paid') {
    doc.setFontSize(9)
    doc.setTextColor(48, 209, 88)
    doc.text('PAID', 56, 20)
  }

  // Right: business info + invoice meta
  const biz = businessName || yourName || ''
  doc.setFontSize(10)
  doc.setTextColor(80)
  if (biz) {
    doc.text(biz, 196, 18, { align: 'right' })
    if (businessName && yourName && businessName !== yourName) {
      doc.text(yourName, 196, 25, { align: 'right' })
    }
  }
  doc.setFontSize(9)
  doc.setTextColor(120)
  doc.text(`Invoice #: ${invoice_number}`, 196, 36, { align: 'right' })
  doc.text(`Date: ${date}`, 196, 43, { align: 'right' })

  // Divider
  doc.setDrawColor(44, 44, 46)
  doc.setLineWidth(0.5)
  doc.line(14, 52, 196, 52)

  // Bill To
  doc.setFontSize(8)
  doc.setTextColor(120)
  doc.text('BILL TO', 14, 60)
  doc.setFontSize(13)
  doc.setTextColor(40)
  doc.text(client || '', 14, 68)

  // ── Line items table ────────────────────────────────────────────────────────
  const tableY = 82
  const cols = [
    { label: 'Description', x: 14  },
    { label: 'Type',        x: 96  },
    { label: 'Qty',         x: 126 },
    { label: 'Rate',        x: 142 },
    { label: 'Amount',      x: 168 },
  ]

  doc.setFillColor(44, 44, 46)
  doc.rect(14, tableY - 5, 182, 8, 'F')
  doc.setFontSize(8)
  doc.setTextColor(200)
  cols.forEach((col) => doc.text(col.label, col.x, tableY))

  let y = tableY + 9
  doc.setTextColor(40)

  items.forEach((item, idx) => {
    if (y > 255) { doc.addPage(); y = 20 }
    if (idx % 2 === 1) {
      doc.setFillColor(245, 245, 248)
      doc.rect(14, y - 5, 182, 7, 'F')
    }
    doc.setFontSize(8)
    doc.setTextColor(40)
    const typeLabel = TYPE_LABELS[item.type] || item.type
    const desc = String(item.description || '').slice(0, 38)
    doc.text(desc, 14, y)
    doc.text(typeLabel, 96, y)
    doc.text(String(item.quantity), 126, y)
    doc.text(`$${Number(item.rate).toFixed(2)}`, 142, y)
    doc.text(`$${Number(item.amount).toFixed(2)}`, 168, y)
    y += 7
  })

  // Total row
  y += 4
  doc.setFillColor(44, 44, 46)
  doc.rect(14, y - 5, 182, 10, 'F')
  doc.setTextColor(200)
  doc.setFontSize(9)
  doc.text('TOTAL', 14, y + 1)
  doc.setFontSize(12)
  doc.text(`$${total.toFixed(2)}`, 168, y + 1)

  // Notes
  if (notes) {
    y += 22
    doc.setFontSize(8)
    doc.setTextColor(120)
    doc.text('NOTES', 14, y)
    y += 6
    doc.setFontSize(9)
    doc.setTextColor(60)
    const lines = doc.splitTextToSize(String(notes), 182)
    doc.text(lines, 14, y)
  }

  return doc
}
```

- [ ] **Step 4: Run tests and confirm they pass**

```bash
cd /Users/tomfreekinr/av-desk && npm test -- tests/renderer/invoicePdf.test.js
```

Expected: all 5 tests pass.

- [ ] **Step 5: Commit**

```bash
cd /Users/tomfreekinr/av-desk && git add src/renderer/src/screens/invoices/invoicePdf.js tests/renderer/invoicePdf.test.js && git commit -m "feat: add jsPDF invoice builder with status, line items, and notes"
```

---

## Task 6: Invoices.jsx main screen + integration test

**Files:**
- Modify: `src/renderer/src/screens/Invoices.jsx`
- Modify: `tests/renderer/App.test.jsx`
- Create: `tests/renderer/Invoices.test.jsx`

- [ ] **Step 1: Write the failing Invoices screen tests**

Create `tests/renderer/Invoices.test.jsx`:

```jsx
import { it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import Invoices from '../../src/renderer/src/screens/Invoices'

const mockInvoices = [
  {
    id: 1,
    invoice_number: 'INV-001',
    date: '2026-04-17',
    client: 'Ovation Events',
    status: 'draft',
    items: [{ description: 'TED Talk', type: 'show_day', quantity: 1, rate: 750, amount: 750 }],
    notes: '',
  },
]

beforeEach(() => {
  window.electronAPI = {
    settings: {
      getAll: vi.fn().mockResolvedValue({ yourName: 'Tom', businessName: 'Tom AV', showDayRate: '750', travelDayRate: '400', hourlyRate: '85' }),
    },
    invoices: {
      list: vi.fn().mockResolvedValue(mockInvoices),
      add: vi.fn().mockResolvedValue({ ...mockInvoices[0], id: 2, invoice_number: 'INV-002' }),
      update: vi.fn().mockResolvedValue({ ...mockInvoices[0], client: 'Updated' }),
      delete: vi.fn().mockResolvedValue(undefined),
      nextNumber: vi.fn().mockResolvedValue('INV-002'),
    },
    clients: { list: vi.fn().mockResolvedValue([]) },
  }
})

it('shows invoice list after loading', async () => {
  render(<Invoices />)
  await waitFor(() => expect(screen.getByText('INV-001')).toBeInTheDocument())
})

it('shows New Invoice button', async () => {
  render(<Invoices />)
  await waitFor(() => expect(screen.getByText('New Invoice')).toBeInTheDocument())
})

it('shows InvoiceForm when New Invoice is clicked', async () => {
  render(<Invoices />)
  await waitFor(() => fireEvent.click(screen.getByText('New Invoice')))
  expect(screen.getByLabelText('Client')).toBeInTheDocument()
})

it('returns to list and calls invoices.add when form saved', async () => {
  render(<Invoices />)
  await waitFor(() => fireEvent.click(screen.getByText('New Invoice')))
  fireEvent.change(screen.getByLabelText('Client'), { target: { value: 'CBRE' } })
  fireEvent.click(screen.getByText('Save'))
  await waitFor(() => {
    expect(window.electronAPI.invoices.add).toHaveBeenCalled()
    expect(screen.queryByLabelText('Client')).not.toBeInTheDocument()
  })
})

it('shows pre-filled form when Edit clicked', async () => {
  render(<Invoices />)
  await waitFor(() => fireEvent.click(screen.getByText('Edit')))
  expect(screen.getByLabelText('Client').value).toBe('Ovation Events')
})

it('calls invoices.delete when Delete clicked', async () => {
  render(<Invoices />)
  await waitFor(() => fireEvent.click(screen.getByText('Delete')))
  await waitFor(() => expect(window.electronAPI.invoices.delete).toHaveBeenCalledWith(1))
})
```

- [ ] **Step 2: Run to confirm fail**

```bash
cd /Users/tomfreekinr/av-desk && npm test -- tests/renderer/Invoices.test.jsx
```

Expected: FAIL — placeholder screen doesn't have the expected elements.

- [ ] **Step 3: Replace src/renderer/src/screens/Invoices.jsx**

```jsx
import { useState, useEffect, useCallback } from 'react'
import ScreenShell from '../components/ScreenShell'
import InvoiceList from './invoices/InvoiceList'
import InvoiceForm from './invoices/InvoiceForm'
import { buildInvoicePdf } from './invoices/invoicePdf'
import { colors } from '../theme'

// view: 'list' | 'add' | 'edit'

export default function Invoices() {
  const [view, setView] = useState('list')
  const [invoices, setInvoices] = useState([])
  const [clients, setClients] = useState([])
  const [editTarget, setEditTarget] = useState(null)
  const [nextNumber, setNextNumber] = useState('INV-001')
  const [defaultRates, setDefaultRates] = useState({})

  const load = useCallback(async () => {
    const [invs, cls, settings, num] = await Promise.all([
      window.electronAPI.invoices.list(),
      window.electronAPI.clients.list(),
      window.electronAPI.settings.getAll(),
      window.electronAPI.invoices.nextNumber(),
    ])
    setInvoices(invs)
    setClients(cls)
    setNextNumber(num)
    setDefaultRates({
      show_day:   Number(settings?.showDayRate)   || 0,
      travel_day: Number(settings?.travelDayRate) || 0,
      hourly:     Number(settings?.hourlyRate)    || 0,
    })
  }, [])

  useEffect(() => { load() }, [load])

  const handleAdd = async (data) => {
    await window.electronAPI.invoices.add(data)
    await load()
    setView('list')
  }

  const handleEdit = (invoice) => {
    setEditTarget(invoice)
    setView('edit')
  }

  const handleUpdate = async (data) => {
    await window.electronAPI.invoices.update(editTarget.id, data)
    await load()
    setEditTarget(null)
    setView('list')
  }

  const handleDelete = async (id) => {
    await window.electronAPI.invoices.delete(id)
    await load()
  }

  const handleExportPdf = async (invoice) => {
    const settings = await window.electronAPI.settings.getAll()
    const doc = buildInvoicePdf({
      invoice,
      businessName: settings?.businessName || '',
      yourName: settings?.yourName || '',
    })
    doc.save(`${invoice.invoice_number}.pdf`)
  }

  const headerRight = view === 'list' && (
    <button
      onClick={() => setView('add')}
      style={{
        backgroundColor: colors.card,
        color: colors.text,
        border: `1px solid ${colors.border}`,
        borderRadius: '7px',
        padding: '7px 16px',
        fontSize: '12px',
        fontWeight: '500',
        cursor: 'pointer',
      }}
    >
      New Invoice
    </button>
  )

  const titles = { list: 'Invoices', add: 'New Invoice', edit: 'Edit Invoice' }

  return (
    <ScreenShell
      title={titles[view]}
      subtitle={view === 'list' ? 'Proforma 1099 invoices for freelance AV work' : undefined}
      headerRight={headerRight}
    >
      {view === 'list' && (
        <InvoiceList
          invoices={invoices}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onExportPdf={handleExportPdf}
        />
      )}
      {view === 'add' && (
        <InvoiceForm
          invoiceNumber={nextNumber}
          onSave={handleAdd}
          onCancel={() => setView('list')}
          clients={clients}
          defaultRates={defaultRates}
        />
      )}
      {view === 'edit' && (
        <InvoiceForm
          invoice={editTarget}
          onSave={handleUpdate}
          onCancel={() => { setEditTarget(null); setView('list') }}
          clients={clients}
          defaultRates={defaultRates}
        />
      )}
    </ScreenShell>
  )
}
```

- [ ] **Step 4: Update App.test.jsx mock to include invoices API**

Read `tests/renderer/App.test.jsx`. Replace the `beforeEach` block:

```jsx
beforeEach(() => {
  window.electronAPI = {
    settings: { getAll: vi.fn().mockResolvedValue({}) },
    expenses: { list: vi.fn().mockResolvedValue([]) },
    clients: { list: vi.fn().mockResolvedValue([]) },
    invoices: {
      list: vi.fn().mockResolvedValue([]),
      nextNumber: vi.fn().mockResolvedValue('INV-001'),
    },
  }
})
```

- [ ] **Step 5: Run Invoices integration tests**

```bash
cd /Users/tomfreekinr/av-desk && npm test -- tests/renderer/Invoices.test.jsx
```

Expected: all 6 tests pass.

- [ ] **Step 6: Run the full test suite**

```bash
cd /Users/tomfreekinr/av-desk && npm test
```

Expected: all tests pass (DB invoices, InvoiceList, InvoiceForm, invoicePdf, Invoices, plus all Plan 2 tests).

- [ ] **Step 7: Commit**

```bash
cd /Users/tomfreekinr/av-desk && git add src/renderer/src/screens/Invoices.jsx src/renderer/src/screens/invoices/ tests/renderer/Invoices.test.jsx tests/renderer/App.test.jsx && git commit -m "feat: complete Invoices screen — list, add, edit, delete, PDF export, status tracking"
```

---

## Spec Coverage Self-Review

| Requirement | Covered by |
|-------------|-----------|
| Proforma invoice creation | Tasks 1–4, 6 |
| Travel days / show days / hourly line items | Tasks 1, 4 |
| Rate auto-fill from Settings | Task 4 (defaultRates) |
| Invoice number auto-generation (INV-001…) | Task 1 (`getNextInvoiceNumber`) |
| Status tracking (draft/sent/paid) | Tasks 3, 4, 6 |
| PDF export per invoice | Tasks 5, 6 |
| Client autocomplete from saved clients | Task 4 |
| Edit / delete invoices | Tasks 3, 6 |
