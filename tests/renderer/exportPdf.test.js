import { it, expect, vi, beforeAll } from 'vitest'

// Minimal canvas mock for jspdf in jsdom
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
