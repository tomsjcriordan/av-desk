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
