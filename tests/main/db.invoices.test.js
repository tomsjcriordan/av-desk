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
