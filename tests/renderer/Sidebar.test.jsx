import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Sidebar from '../../src/renderer/src/components/Sidebar'

describe('Sidebar', () => {
  const renderSidebar = (path = '/expenses') => {
    return render(
      <MemoryRouter initialEntries={[path]}>
        <Sidebar />
      </MemoryRouter>
    )
  }

  it('renders all Work section nav items', () => {
    renderSidebar()
    expect(screen.getByText('Expenses')).toBeInTheDocument()
    expect(screen.getByText('Invoices')).toBeInTheDocument()
    expect(screen.getByText('AV Agent')).toBeInTheDocument()
    expect(screen.getByText('File Distribution')).toBeInTheDocument()
  })

  it('renders all Content Studio nav items', () => {
    renderSidebar()
    expect(screen.getByText('Folded Steel')).toBeInTheDocument()
    expect(screen.getByText('Cook Travel Dad')).toBeInTheDocument()
    expect(screen.getByText('From Points to Travel')).toBeInTheDocument()
    expect(screen.getByText('Furniture Flip')).toBeInTheDocument()
    expect(screen.getByText('Propagate IQ')).toBeInTheDocument()
    expect(screen.getByText('Reconnect Deck')).toBeInTheDocument()
  })

  it('renders Settings link', () => {
    renderSidebar()
    expect(screen.getByText('Settings')).toBeInTheDocument()
  })

  it('highlights the active nav item and not inactive ones', () => {
    renderSidebar('/expenses')
    const activeItem = screen.getByText('Expenses').closest('a')
    const inactiveItem = screen.getByText('Invoices').closest('a')
    expect(activeItem.getAttribute('style')).toContain('background-color: rgb(44, 44, 46)')
    expect(inactiveItem.getAttribute('style')).not.toContain('background-color: rgb(44, 44, 46)')
  })
})
