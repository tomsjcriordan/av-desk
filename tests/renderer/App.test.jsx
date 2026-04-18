import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from '../../src/renderer/src/App'

beforeEach(() => {
  window.electronAPI = {
    settings: { getAll: vi.fn().mockResolvedValue({}) },
    expenses: { list: vi.fn().mockResolvedValue([]) },
    clients: { list: vi.fn().mockResolvedValue([]) },
    invoices: { list: vi.fn().mockResolvedValue([]), nextNumber: vi.fn().mockResolvedValue('INV-001') },
    agent: { chat: vi.fn().mockResolvedValue({ text: '' }), selectImage: vi.fn().mockResolvedValue(null) },
    venues: { list: vi.fn().mockResolvedValue([]) },
    rooms: { list: vi.fn().mockResolvedValue([]) },
  }
})

describe('App', () => {
  it('renders the sidebar', () => {
    render(<App />)
    expect(screen.getByText('AV Desk')).toBeInTheDocument()
  })

  it('renders the expenses screen by default', () => {
    render(<App />)
    expect(screen.getAllByText('Expenses').length).toBeGreaterThan(0)
  })
})
