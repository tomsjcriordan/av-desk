import { it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import InvoiceList from '../../src/renderer/src/screens/invoices/InvoiceList'

const sampleInvoices = [
  { id: 1, invoice_number: 'INV-001', date: '2026-04-17', client: 'Ovation Events', status: 'draft', items: [{ description: 'Show Day', type: 'show_day', quantity: 1, rate: 750, amount: 750 }, { description: 'Travel', type: 'travel_day', quantity: 1, rate: 400, amount: 400 }], notes: '' },
  { id: 2, invoice_number: 'INV-002', date: '2026-04-16', client: 'CBRE', status: 'paid', items: [{ description: 'Load-in', type: 'hourly', quantity: 4, rate: 85, amount: 340 }], notes: '' },
]

it('renders invoice rows', () => {
  render(<InvoiceList invoices={sampleInvoices} onEdit={vi.fn()} onDelete={vi.fn()} onExportPdf={vi.fn()} />)
  expect(screen.getByText('INV-001')).toBeInTheDocument()
  expect(screen.getByText('Ovation Events')).toBeInTheDocument()
})
it('shows computed totals', () => {
  render(<InvoiceList invoices={sampleInvoices} onEdit={vi.fn()} onDelete={vi.fn()} onExportPdf={vi.fn()} />)
  expect(screen.getByText('$1,150.00')).toBeInTheDocument()
  expect(screen.getByText('$340.00')).toBeInTheDocument()
})
it('shows status badges', () => {
  render(<InvoiceList invoices={sampleInvoices} onEdit={vi.fn()} onDelete={vi.fn()} onExportPdf={vi.fn()} />)
  expect(screen.getByText('draft')).toBeInTheDocument()
  expect(screen.getByText('paid')).toBeInTheDocument()
})
it('shows empty state', () => {
  render(<InvoiceList invoices={[]} onEdit={vi.fn()} onDelete={vi.fn()} onExportPdf={vi.fn()} />)
  expect(screen.getByText(/no invoices/i)).toBeInTheDocument()
})
it('calls onEdit', () => {
  const onEdit = vi.fn()
  render(<InvoiceList invoices={sampleInvoices} onEdit={onEdit} onDelete={vi.fn()} onExportPdf={vi.fn()} />)
  fireEvent.click(screen.getAllByText('Edit')[0])
  expect(onEdit).toHaveBeenCalledWith(sampleInvoices[0])
})
it('calls onDelete', () => {
  const onDelete = vi.fn()
  render(<InvoiceList invoices={sampleInvoices} onEdit={vi.fn()} onDelete={onDelete} onExportPdf={vi.fn()} />)
  fireEvent.click(screen.getAllByText('Delete')[0])
  expect(onDelete).toHaveBeenCalledWith(1)
})
it('calls onExportPdf', () => {
  const onExportPdf = vi.fn()
  render(<InvoiceList invoices={sampleInvoices} onEdit={vi.fn()} onDelete={vi.fn()} onExportPdf={onExportPdf} />)
  fireEvent.click(screen.getAllByText('PDF')[0])
  expect(onExportPdf).toHaveBeenCalledWith(sampleInvoices[0])
})
