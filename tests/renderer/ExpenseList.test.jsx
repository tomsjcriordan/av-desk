import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ExpenseList from '../../src/renderer/src/screens/expenses/ExpenseList'

const sampleExpenses = [
  { id: 1, date: '2026-04-17', show_name: 'TED Talk', client: 'Ovation Events', type: 'show_day', hours: null, rate: 750, amount: 750, notes: '' },
  { id: 2, date: '2026-04-16', show_name: 'Load-in', client: 'CBRE', type: 'hourly', hours: 4, rate: 85, amount: 340, notes: 'Setup' },
]

it('renders the expense table with rows', () => {
  render(<ExpenseList expenses={sampleExpenses} onEdit={vi.fn()} onDelete={vi.fn()} />)
  expect(screen.getByText('TED Talk')).toBeInTheDocument()
  expect(screen.getByText('Load-in')).toBeInTheDocument()
  expect(screen.getByText('Ovation Events')).toBeInTheDocument()
})

it('shows type labels', () => {
  render(<ExpenseList expenses={sampleExpenses} onEdit={vi.fn()} onDelete={vi.fn()} />)
  expect(screen.getByText('Show Day')).toBeInTheDocument()
  expect(screen.getByText('Hourly')).toBeInTheDocument()
})

it('shows formatted amounts', () => {
  render(<ExpenseList expenses={sampleExpenses} onEdit={vi.fn()} onDelete={vi.fn()} />)
  // $750.00 appears in both rate and amount columns for the show_day row
  expect(screen.getAllByText('$750.00').length).toBeGreaterThanOrEqual(1)
  expect(screen.getByText('$340.00')).toBeInTheDocument()
})

it('shows total row', () => {
  render(<ExpenseList expenses={sampleExpenses} onEdit={vi.fn()} onDelete={vi.fn()} />)
  expect(screen.getByText('$1,090.00')).toBeInTheDocument()
})

it('shows empty state when no expenses', () => {
  render(<ExpenseList expenses={[]} onEdit={vi.fn()} onDelete={vi.fn()} />)
  expect(screen.getByText(/no expenses/i)).toBeInTheDocument()
})

it('calls onEdit with the expense when Edit is clicked', () => {
  const onEdit = vi.fn()
  render(<ExpenseList expenses={sampleExpenses} onEdit={onEdit} onDelete={vi.fn()} />)
  fireEvent.click(screen.getAllByText('Edit')[0])
  expect(onEdit).toHaveBeenCalledWith(sampleExpenses[0])
})

it('calls onDelete with the expense id when Delete is clicked', () => {
  const onDelete = vi.fn()
  render(<ExpenseList expenses={sampleExpenses} onEdit={vi.fn()} onDelete={onDelete} />)
  fireEvent.click(screen.getAllByText('Delete')[0])
  expect(onDelete).toHaveBeenCalledWith(1)
})
