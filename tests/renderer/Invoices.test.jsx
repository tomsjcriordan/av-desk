import { it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import Invoices from '../../src/renderer/src/screens/Invoices'

const mockInvoices = [{ id: 1, invoice_number: 'INV-001', date: '2026-04-17', client: 'Ovation Events', status: 'draft', items: [{ description: 'TED Talk', type: 'show_day', quantity: 1, rate: 750, amount: 750 }], notes: '' }]

beforeEach(() => {
  window.electronAPI = {
    settings: { getAll: vi.fn().mockResolvedValue({ yourName: 'Tom', businessName: 'Tom AV', showDayRate: '750', travelDayRate: '400', hourlyRate: '85' }) },
    invoices: { list: vi.fn().mockResolvedValue(mockInvoices), add: vi.fn().mockResolvedValue({ ...mockInvoices[0], id: 2 }), update: vi.fn().mockResolvedValue(mockInvoices[0]), delete: vi.fn().mockResolvedValue(undefined), nextNumber: vi.fn().mockResolvedValue('INV-002') },
    clients: { list: vi.fn().mockResolvedValue([]) },
  }
})

it('shows invoice list after loading', async () => { render(<Invoices />); await waitFor(() => expect(screen.getByText('INV-001')).toBeInTheDocument()) })
it('shows New Invoice button', async () => { render(<Invoices />); await waitFor(() => expect(screen.getByText('New Invoice')).toBeInTheDocument()) })
it('shows form when New Invoice clicked', async () => { render(<Invoices />); await waitFor(() => fireEvent.click(screen.getByText('New Invoice'))); expect(screen.getByLabelText('Client')).toBeInTheDocument() })
it('calls add and returns to list on save', async () => {
  render(<Invoices />)
  await waitFor(() => fireEvent.click(screen.getByText('New Invoice')))
  fireEvent.change(screen.getByLabelText('Client'), { target: { value: 'CBRE' } })
  fireEvent.click(screen.getByText('Save'))
  await waitFor(() => { expect(window.electronAPI.invoices.add).toHaveBeenCalled(); expect(screen.queryByLabelText('Client')).not.toBeInTheDocument() })
})
it('pre-fills form when Edit clicked', async () => { render(<Invoices />); await waitFor(() => fireEvent.click(screen.getByText('Edit'))); expect(screen.getByLabelText('Client').value).toBe('Ovation Events') })
it('calls delete when Delete clicked', async () => { render(<Invoices />); await waitFor(() => fireEvent.click(screen.getByText('Delete'))); await waitFor(() => expect(window.electronAPI.invoices.delete).toHaveBeenCalledWith(1)) })
