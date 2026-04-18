import Database from 'better-sqlite3'
import { join } from 'path'

/**
 * initDb — run migrations on an existing Database instance.
 * Exported separately so tests can pass an in-memory DB.
 */
export function initDb(db) {
  db.pragma('journal_mode = WAL')
  db.exec(`
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
    CREATE TABLE IF NOT EXISTS venues (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT    NOT NULL,
      notes      TEXT    DEFAULT '',
      created_at TEXT    DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS rooms (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      venue_id   INTEGER NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
      name       TEXT    NOT NULL,
      ip_address TEXT    NOT NULL DEFAULT '',
      share_path TEXT    DEFAULT '',
      status     TEXT    NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','delivered')),
      created_at TEXT    DEFAULT (datetime('now'))
    );
  `)
  db.pragma('foreign_keys = ON')
}

let _db = null

/**
 * getDb — returns the singleton DB for the main process.
 * @param {function} appGetPath  app.getPath bound to the Electron app instance
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

// ── Venues ──────────────────────────────────────────────────────────────────

export function listVenues(db) {
  return db.prepare('SELECT * FROM venues ORDER BY name ASC').all()
}

export function addVenue(db, { name, notes }) {
  const { lastInsertRowid } = db.prepare(
    'INSERT INTO venues (name, notes) VALUES (?, ?)'
  ).run(name, notes ?? '')
  return db.prepare('SELECT * FROM venues WHERE id = ?').get(lastInsertRowid)
}

export function deleteVenue(db, id) {
  db.prepare('DELETE FROM rooms WHERE venue_id = ?').run(id)
  db.prepare('DELETE FROM venues WHERE id = ?').run(id)
}

// ── Rooms ───────────────────────────────────────────────────────────────────

export function listRooms(db, venueId) {
  return db.prepare('SELECT * FROM rooms WHERE venue_id = ? ORDER BY name ASC').all(venueId)
}

export function addRoom(db, { venue_id, name, ip_address, share_path }) {
  const { lastInsertRowid } = db.prepare(
    'INSERT INTO rooms (venue_id, name, ip_address, share_path) VALUES (?, ?, ?, ?)'
  ).run(venue_id, name, ip_address ?? '', share_path ?? '')
  return db.prepare('SELECT * FROM rooms WHERE id = ?').get(lastInsertRowid)
}

export function updateRoomStatus(db, id, status) {
  db.prepare('UPDATE rooms SET status = ? WHERE id = ?').run(status, id)
  return db.prepare('SELECT * FROM rooms WHERE id = ?').get(id)
}

export function deleteRoom(db, id) {
  db.prepare('DELETE FROM rooms WHERE id = ?').run(id)
}

export function resetRooms(db, venueId) {
  db.prepare("UPDATE rooms SET status = 'pending' WHERE venue_id = ?").run(venueId)
}
