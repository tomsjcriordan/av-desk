import { it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import FileDistribution from '../../src/renderer/src/screens/FileDistribution'

const mockVenues = [
  { id: 1, name: 'Marriott Downtown', notes: '' },
]
const mockRooms = [
  { id: 1, venue_id: 1, name: 'Room 101', ip_address: '10.0.0.1', share_path: '', status: 'pending' },
]

beforeEach(() => {
  window.electronAPI = {
    venues: {
      list: vi.fn().mockResolvedValue(mockVenues),
      add: vi.fn().mockResolvedValue({ id: 2, name: 'Hilton', notes: '' }),
      delete: vi.fn().mockResolvedValue(undefined),
    },
    rooms: {
      list: vi.fn().mockResolvedValue(mockRooms),
      add: vi.fn().mockResolvedValue({ id: 2, venue_id: 1, name: 'Room 202', ip_address: '10.0.0.2', share_path: '', status: 'pending' }),
      updateStatus: vi.fn().mockResolvedValue({ ...mockRooms[0], status: 'delivered' }),
      delete: vi.fn().mockResolvedValue(undefined),
      reset: vi.fn().mockResolvedValue(undefined),
    },
  }
})

it('shows guide steps after loading', async () => {
  render(<FileDistribution />)
  await waitFor(() => expect(screen.getByText(/connect to venue network/i)).toBeInTheDocument())
})

it('shows venue selector', async () => {
  render(<FileDistribution />)
  await waitFor(() => expect(screen.getByText('Marriott Downtown')).toBeInTheDocument())
})

it('shows room tracker with rooms', async () => {
  render(<FileDistribution />)
  await waitFor(() => expect(screen.getByText('Room 101')).toBeInTheDocument())
})

it('calls rooms.updateStatus when status toggled', async () => {
  render(<FileDistribution />)
  await waitFor(() => fireEvent.click(screen.getByText('pending')))
  await waitFor(() => expect(window.electronAPI.rooms.updateStatus).toHaveBeenCalledWith(1, 'delivered'))
})

it('calls rooms.delete when room deleted', async () => {
  render(<FileDistribution />)
  await waitFor(() => fireEvent.click(screen.getByText('×')))
  await waitFor(() => expect(window.electronAPI.rooms.delete).toHaveBeenCalledWith(1))
})
