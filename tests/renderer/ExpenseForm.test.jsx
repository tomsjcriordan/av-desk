import { it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ExpenseForm from '../../src/renderer/src/screens/expenses/ExpenseForm'

const clients = [
  { id: 1, name: 'Ovation Events', contact: 'Jane', email: 'jane@ovation.com', notes: '' },
]

it('renders all fields', () => {
  render(<ExpenseForm onSave={vi.fn()} onCancel={vi.fn()} clients={clients} defaultRates={{}} />)
  expect(screen.getByLabelText('Date')).toBeInTheDocument()
  expect(screen.getByLabelText('Show Name')).toBeInTheDocument()
  expect(screen.getByLabelText('Client')).toBeInTheDocument()
  expect(screen.getByLabelText('Type')).toBeInTheDocument()
  expect(screen.getByLabelText('Rate ($)')).toBeInTheDocument()
  expect(screen.getByLabelText('Notes')).toBeInTheDocument()
})

it('hides Hours field when type is show_day', () => {
  render(<ExpenseForm onSave={vi.fn()} onCancel={vi.fn()} clients={clients} defaultRates={{}} />)
  expect(screen.queryByLabelText('Hours')).not.toBeInTheDocument()
})

it('shows Hours field when type is hourly', () => {
  render(<ExpenseForm onSave={vi.fn()} onCancel={vi.fn()} clients={clients} defaultRates={{}} />)
  fireEvent.change(screen.getByLabelText('Type'), { target: { value: 'hourly' } })
  expect(screen.getByLabelText('Hours')).toBeInTheDocument()
})

it('auto-fills rate from defaultRates when type changes', () => {
  render(
    <ExpenseForm
      onSave={vi.fn()}
      onCancel={vi.fn()}
      clients={clients}
      defaultRates={{ travel_day: 400, show_day: 750, hourly: 85 }}
    />
  )
  expect(screen.getByLabelText('Rate ($)').value).toBe('750')
  fireEvent.change(screen.getByLabelText('Type'), { target: { value: 'travel_day' } })
  expect(screen.getByLabelText('Rate ($)').value).toBe('400')
})

it('auto-calculates amount for show_day (rate only)', () => {
  render(<ExpenseForm onSave={vi.fn()} onCancel={vi.fn()} clients={clients} defaultRates={{ show_day: 750 }} />)
  expect(screen.getByText('$750.00')).toBeInTheDocument()
})

it('auto-calculates amount for hourly (hours × rate)', () => {
  render(<ExpenseForm onSave={vi.fn()} onCancel={vi.fn()} clients={clients} defaultRates={{ hourly: 85 }} />)
  fireEvent.change(screen.getByLabelText('Type'), { target: { value: 'hourly' } })
  fireEvent.change(screen.getByLabelText('Hours'), { target: { value: '4' } })
  expect(screen.getByText('$340.00')).toBeInTheDocument()
})

it('calls onSave with correct data when form is submitted', async () => {
  const onSave = vi.fn()
  render(
    <ExpenseForm
      onSave={onSave}
      onCancel={vi.fn()}
      clients={clients}
      defaultRates={{ show_day: 750 }}
    />
  )
  fireEvent.change(screen.getByLabelText('Show Name'), { target: { value: 'TED Talk' } })
  fireEvent.change(screen.getByLabelText('Client'), { target: { value: 'Ovation Events' } })
  fireEvent.click(screen.getByText('Save'))
  await waitFor(() => {
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        show_name: 'TED Talk',
        client: 'Ovation Events',
        type: 'show_day',
        rate: 750,
        amount: 750,
      })
    )
  })
})

it('pre-fills fields when editing an existing expense', () => {
  const existing = { date: '2026-04-17', show_name: 'Old Show', client: 'CBRE', type: 'hourly', hours: 3, rate: 85, amount: 255, notes: 'Setup' }
  render(<ExpenseForm expense={existing} onSave={vi.fn()} onCancel={vi.fn()} clients={clients} defaultRates={{}} />)
  expect(screen.getByLabelText('Show Name').value).toBe('Old Show')
  expect(screen.getByLabelText('Hours').value).toBe('3')
})

it('calls onCancel when Cancel is clicked', () => {
  const onCancel = vi.fn()
  render(<ExpenseForm onSave={vi.fn()} onCancel={onCancel} clients={clients} defaultRates={{}} />)
  fireEvent.click(screen.getByText('Cancel'))
  expect(onCancel).toHaveBeenCalled()
})
