import { it, expect, vi, beforeAll } from 'vitest'
beforeAll(() => {
  global.HTMLCanvasElement.prototype.getContext = () => ({ fillRect: vi.fn(), clearRect: vi.fn(), getImageData: vi.fn(() => ({ data: [] })), setTransform: vi.fn(), drawImage: vi.fn(), save: vi.fn(), fillText: vi.fn(), restore: vi.fn(), beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), closePath: vi.fn(), stroke: vi.fn(), translate: vi.fn(), scale: vi.fn(), rotate: vi.fn(), arc: vi.fn(), fill: vi.fn(), measureText: vi.fn(() => ({ width: 0 })), transform: vi.fn(), rect: vi.fn(), clip: vi.fn() })
  global.URL.createObjectURL = vi.fn(() => 'blob:mock')
})
import { buildInvoicePdf } from '../../src/renderer/src/screens/invoices/invoicePdf'
const invoice = { invoice_number: 'INV-001', date: '2026-04-17', client: 'Ovation Events', status: 'draft', items: [{ description: 'TED Talk', type: 'show_day', quantity: 1, rate: 750, amount: 750 }], notes: 'Net 30' }
it('returns jsPDF doc', () => { const doc = buildInvoicePdf({ invoice, businessName: 'Tom AV', yourName: 'Tom' }); expect(typeof doc.save).toBe('function') })
it('no throw empty items', () => { expect(() => buildInvoicePdf({ invoice: { ...invoice, items: [] }, businessName: '', yourName: '' })).not.toThrow() })
it('no throw paid status', () => { expect(() => buildInvoicePdf({ invoice: { ...invoice, status: 'paid' }, businessName: 'Tom AV', yourName: 'Tom' })).not.toThrow() })
it('no throw no notes', () => { expect(() => buildInvoicePdf({ invoice: { ...invoice, notes: '' }, businessName: 'Tom AV', yourName: 'Tom' })).not.toThrow() })
it('no throw no biz name', () => { expect(() => buildInvoicePdf({ invoice, businessName: '', yourName: '' })).not.toThrow() })
