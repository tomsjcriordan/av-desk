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
it('adds a new line item row', () => {
  render(<InvoiceForm invoiceNumber="INV-001" onSave={vi.fn()} onCancel={vi.fn()} clients={clients} defaultRates={defaultRates} />)
  fireEvent.click(screen.getByText('+ Add Line Item'))
  expect(screen.getByLabelText('item-1-description')).toBeInTheDocument()
})
it('removes a line item', () => {
  render(<InvoiceForm invoiceNumber="INV-001" onSave={vi.fn()} onCancel={vi.fn()} clients={clients} defaultRates={defaultRates} />)
  fireEvent.click(screen.getByText('+ Add Line Item'))
  fireEvent.click(screen.getByLabelText('remove-item-1'))
  expect(screen.queryByLabelText('item-1-description')).not.toBeInTheDocument()
})
it('auto-calculates amount', () => {
  render(<InvoiceForm invoiceNumber="INV-001" onSave={vi.fn()} onCancel={vi.fn()} clients={clients} defaultRates={defaultRates} />)
  fireEvent.change(screen.getByLabelText('item-0-quantity'), { target: { value: '2' } })
  expect(screen.getAllByText('$1,500.00').length).toBeGreaterThanOrEqual(1)
})
it('calls onSave with correct shape', async () => {
  const onSave = vi.fn()
  render(<InvoiceForm invoiceNumber="INV-001" onSave={onSave} onCancel={vi.fn()} clients={clients} defaultRates={defaultRates} />)
  fireEvent.change(screen.getByLabelText('Client'), { target: { value: 'Ovation Events' } })
  fireEvent.click(screen.getByText('Save'))
  await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ invoice_number: 'INV-001', client: 'Ovation Events', status: 'draft' })))
})
it('pre-fills when editing', () => {
  const existing = { invoice_number: 'INV-002', date: '2026-04-17', client: 'CBRE', status: 'sent', items: [{ description: 'Load-in', type: 'hourly', quantity: 4, rate: 85, amount: 340 }], notes: '' }
  render(<InvoiceForm invoice={existing} onSave={vi.fn()} onCancel={vi.fn()} clients={clients} defaultRates={defaultRates} />)
  expect(screen.getByLabelText('Client').value).toBe('CBRE')
  expect(screen.getByLabelText('item-0-description').value).toBe('Load-in')
})
it('calls onCancel', () => {
  const onCancel = vi.fn()
  render(<InvoiceForm invoiceNumber="INV-001" onSave={vi.fn()} onCancel={onCancel} clients={clients} defaultRates={defaultRates} />)
  fireEvent.click(screen.getByText('Cancel'))
  expect(onCancel).toHaveBeenCalled()
})
