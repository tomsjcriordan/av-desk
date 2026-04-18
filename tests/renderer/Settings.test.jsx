import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import Settings from '../../src/renderer/src/screens/Settings'

// Mock the Electron API
beforeEach(() => {
  window.electronAPI = {
    settings: {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
      getAll: vi.fn().mockResolvedValue({
        yourName: 'Tom Riordan',
        businessName: '',
        travelDayRate: '',
        showDayRate: '',
        hourlyRate: '',
        claudeApiKey: '',
      }),
    },
  }
})

describe('Settings', () => {
  it('renders all setting fields', async () => {
    render(<Settings />)
    await waitFor(() => {
      expect(screen.getByLabelText('Your Name')).toBeInTheDocument()
      expect(screen.getByLabelText('Business Name')).toBeInTheDocument()
      expect(screen.getByLabelText('Travel Day Rate ($)')).toBeInTheDocument()
      expect(screen.getByLabelText('Show Day Rate ($)')).toBeInTheDocument()
      expect(screen.getByLabelText('Hourly Rate ($)')).toBeInTheDocument()
      expect(screen.getByLabelText('Claude API Key')).toBeInTheDocument()
    })
  })

  it('loads saved values on mount', async () => {
    render(<Settings />)
    await waitFor(() => {
      expect(screen.getByLabelText('Your Name').value).toBe('Tom Riordan')
    })
  })

  it('saves all fields when Save is clicked', async () => {
    render(<Settings />)
    await waitFor(() => screen.getByLabelText('Your Name'))
    fireEvent.change(screen.getByLabelText('Your Name'), { target: { value: 'Tom R.' } })
    fireEvent.click(screen.getByText('Save Settings'))
    await waitFor(() => {
      expect(window.electronAPI.settings.set).toHaveBeenCalledWith('yourName', 'Tom R.')
    })
  })
})
