import { it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import Expenses from '../../src/renderer/src/screens/Expenses'

const mockExpenses = [
  { id: 1, date: '2026-04-17', show_name: 'TED Talk', client: 'Ovation Events', type: 'show_day', hours: null, rate: 750, amount: 750, notes: '' },
]

beforeEach(() => {
  window.electronAPI = {
    settings: {
      getAll: vi.fn().mockResolvedValue({ yourName: 'Tom', businessName: 'Tom AV', showDayRate: '750', travelDayRate: '400', hourlyRate: '85' }),
    },
    expenses: {
      list: vi.fn().mockResolvedValue(mockExpenses),
      add: vi.fn().mockResolvedValue({ id: 2, date: '2026-04-18', show_name: 'New Show', client: 'CBRE', type: 'show_day', hours: null, rate: 750, amount: 750, notes: '' }),
      update: vi.fn().mockResolvedValue({ ...mockExpenses[0], show_name: 'Updated' }),
      delete: vi.fn().mockResolvedValue(undefined),
    },
    clients: {
      list: vi.fn().mockResolvedValue([]),
      upsert: vi.fn().mockResolvedValue({ id: 1, name: 'Ovation Events', contact: '', email: '', notes: '' }),
    },
  }
})

it('shows expense list after loading', async () => {
  render(<Expenses />)
  await waitFor(() => {
    expect(screen.getByText('TED Talk')).toBeInTheDocument()
  })
})

it('shows Add Expense button', async () => {
  render(<Expenses />)
  await waitFor(() => expect(screen.getByText('Add Expense')).toBeInTheDocument())
})

it('shows ExpenseForm when Add Expense is clicked', async () => {
  render(<Expenses />)
  await waitFor(() => fireEvent.click(screen.getByText('Add Expense')))
  expect(screen.getByLabelText('Show Name')).toBeInTheDocument()
})

it('returns to list and calls expenses.add when form is saved', async () => {
  render(<Expenses />)
  await waitFor(() => fireEvent.click(screen.getByText('Add Expense')))
  fireEvent.change(screen.getByLabelText('Show Name'), { target: { value: 'New Show' } })
  fireEvent.change(screen.getByLabelText('Client'), { target: { value: 'CBRE' } })
  fireEvent.click(screen.getByText('Save'))
  await waitFor(() => {
    expect(window.electronAPI.expenses.add).toHaveBeenCalled()
    expect(screen.queryByLabelText('Show Name')).not.toBeInTheDocument()
  })
})

it('shows ExpenseForm pre-filled when Edit is clicked', async () => {
  render(<Expenses />)
  await waitFor(() => fireEvent.click(screen.getByText('Edit')))
  expect(screen.getByLabelText('Show Name').value).toBe('TED Talk')
})

it('calls expenses.delete when Delete is clicked', async () => {
  render(<Expenses />)
  await waitFor(() => fireEvent.click(screen.getByText('Delete')))
  await waitFor(() => expect(window.electronAPI.expenses.delete).toHaveBeenCalledWith(1))
})

it('shows Export PDF button', async () => {
  render(<Expenses />)
  await waitFor(() => expect(screen.getByText('Export PDF')).toBeInTheDocument())
})
