import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from '../../src/renderer/src/App'

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
