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
