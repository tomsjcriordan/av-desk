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
    CREATE TABLE IF NOT EXISTS content_suggestions (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      account    TEXT    NOT NULL,
      workflow   TEXT    NOT NULL CHECK(workflow IN ('calendar','caption','analyze','monetize','chat')),
      content    TEXT    NOT NULL,
      status     TEXT    NOT NULL DEFAULT 'suggested' CHECK(status IN ('suggested','posted','skipped')),
      created_at TEXT    DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS content_posts (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      account        TEXT    NOT NULL,
      platform       TEXT    NOT NULL CHECK(platform IN ('instagram','facebook','tiktok')),
      post_type      TEXT    NOT NULL CHECK(post_type IN ('reel','post','story','carousel')),
      title          TEXT    NOT NULL DEFAULT '',
      caption        TEXT    DEFAULT '',
      posted_date    TEXT    NOT NULL,
      views          INTEGER NOT NULL DEFAULT 0,
      likes          INTEGER NOT NULL DEFAULT 0,
      saves          INTEGER NOT NULL DEFAULT 0,
      shares         INTEGER NOT NULL DEFAULT 0,
      comments       INTEGER NOT NULL DEFAULT 0,
      watch_time_sec REAL    DEFAULT 0,
      revenue        REAL    DEFAULT 0,
      suggestion_id  INTEGER DEFAULT NULL REFERENCES content_suggestions(id),
      notes          TEXT    DEFAULT '',
      created_at     TEXT    DEFAULT (datetime('now'))
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

// ── Content Suggestions ─────────────────────────────────────────────────────

export function addSuggestion(db, { account, workflow, content }) {
  const { lastInsertRowid } = db.prepare(
    'INSERT INTO content_suggestions (account, workflow, content) VALUES (?, ?, ?)'
  ).run(account, workflow, content)
  return db.prepare('SELECT * FROM content_suggestions WHERE id = ?').get(lastInsertRowid)
}

export function listSuggestions(db, account, status) {
  if (status) {
    return db.prepare('SELECT * FROM content_suggestions WHERE account = ? AND status = ? ORDER BY id DESC').all(account, status)
  }
  return db.prepare('SELECT * FROM content_suggestions WHERE account = ? ORDER BY id DESC').all(account)
}

export function updateSuggestionStatus(db, id, status) {
  db.prepare('UPDATE content_suggestions SET status = ? WHERE id = ?').run(status, id)
  return db.prepare('SELECT * FROM content_suggestions WHERE id = ?').get(id)
}

// ── Content Posts ────────────────────────────────────────────────────────────

export function addPost(db, { account, platform, post_type, title, caption, posted_date, views, likes, saves, shares, comments, watch_time_sec, revenue, suggestion_id, notes }) {
  const { lastInsertRowid } = db.prepare(
    `INSERT INTO content_posts (account, platform, post_type, title, caption, posted_date, views, likes, saves, shares, comments, watch_time_sec, revenue, suggestion_id, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(account, platform, post_type, title, caption ?? '', posted_date, views, likes, saves, shares, comments, watch_time_sec ?? 0, revenue ?? 0, suggestion_id ?? null, notes ?? '')
  if (suggestion_id) {
    db.prepare("UPDATE content_suggestions SET status = 'posted' WHERE id = ?").run(suggestion_id)
  }
  return db.prepare('SELECT * FROM content_posts WHERE id = ?').get(lastInsertRowid)
}

export function listPosts(db, account, limit = 50) {
  return db.prepare('SELECT * FROM content_posts WHERE account = ? ORDER BY posted_date DESC, id DESC LIMIT ?').all(account, limit)
}

export function deletePost(db, id) {
  db.prepare('DELETE FROM content_posts WHERE id = ?').run(id)
}

export function getPostStats(db, account) {
  const posts = listPosts(db, account)
  if (posts.length === 0) {
    return { totalPosts: 0, avgViews: 0, topPosts: [], byType: {} }
  }
  const totalViews = posts.reduce((sum, p) => sum + p.views, 0)
  const topPosts = [...posts].sort((a, b) => b.views - a.views).slice(0, 5)
  const byType = {}
  for (const p of posts) {
    if (!byType[p.post_type]) byType[p.post_type] = { count: 0, totalViews: 0 }
    byType[p.post_type].count++
    byType[p.post_type].totalViews += p.views
  }
  for (const t of Object.keys(byType)) {
    byType[t].avgViews = Math.round(byType[t].totalViews / byType[t].count)
  }
  return {
    totalPosts: posts.length,
    avgViews: Math.round(totalViews / posts.length),
    topPosts,
    byType,
  }
}
