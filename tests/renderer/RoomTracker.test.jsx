import { it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import RoomTracker from '../../src/renderer/src/screens/filedist/RoomTracker'

const sampleRooms = [
  { id: 1, name: 'Room 101', ip_address: '10.0.0.1', share_path: '', status: 'pending' },
  { id: 2, name: 'Room 202', ip_address: '10.0.0.2', share_path: '', status: 'delivered' },
]

it('renders room rows', () => {
  render(<RoomTracker rooms={sampleRooms} onToggle={vi.fn()} onDelete={vi.fn()} onAdd={vi.fn()} onReset={vi.fn()} />)
  expect(screen.getByText('Room 101')).toBeInTheDocument()
  expect(screen.getByText('Room 202')).toBeInTheDocument()
})

it('shows IP addresses', () => {
  render(<RoomTracker rooms={sampleRooms} onToggle={vi.fn()} onDelete={vi.fn()} onAdd={vi.fn()} onReset={vi.fn()} />)
  expect(screen.getByText('10.0.0.1')).toBeInTheDocument()
})

it('shows delivery status', () => {
  render(<RoomTracker rooms={sampleRooms} onToggle={vi.fn()} onDelete={vi.fn()} onAdd={vi.fn()} onReset={vi.fn()} />)
  expect(screen.getByText('pending')).toBeInTheDocument()
  expect(screen.getByText('delivered')).toBeInTheDocument()
})

it('calls onToggle when status badge clicked', () => {
  const onToggle = vi.fn()
  render(<RoomTracker rooms={sampleRooms} onToggle={onToggle} onDelete={vi.fn()} onAdd={vi.fn()} onReset={vi.fn()} />)
  fireEvent.click(screen.getByText('pending'))
  expect(onToggle).toHaveBeenCalledWith(1, 'delivered')
})

it('toggles delivered back to pending', () => {
  const onToggle = vi.fn()
  render(<RoomTracker rooms={sampleRooms} onToggle={onToggle} onDelete={vi.fn()} onAdd={vi.fn()} onReset={vi.fn()} />)
  fireEvent.click(screen.getByText('delivered'))
  expect(onToggle).toHaveBeenCalledWith(2, 'pending')
})

it('calls onDelete when delete clicked', () => {
  const onDelete = vi.fn()
  render(<RoomTracker rooms={sampleRooms} onToggle={vi.fn()} onDelete={onDelete} onAdd={vi.fn()} onReset={vi.fn()} />)
  fireEvent.click(screen.getAllByText('×')[0])
  expect(onDelete).toHaveBeenCalledWith(1)
})

it('shows empty state when no rooms', () => {
  render(<RoomTracker rooms={[]} onToggle={vi.fn()} onDelete={vi.fn()} onAdd={vi.fn()} onReset={vi.fn()} />)
  expect(screen.getByText(/no rooms/i)).toBeInTheDocument()
})

it('shows delivery progress', () => {
  render(<RoomTracker rooms={sampleRooms} onToggle={vi.fn()} onDelete={vi.fn()} onAdd={vi.fn()} onReset={vi.fn()} />)
  expect(screen.getByText('1 / 2 delivered')).toBeInTheDocument()
})

it('shows Add Room button', () => {
  render(<RoomTracker rooms={sampleRooms} onToggle={vi.fn()} onDelete={vi.fn()} onAdd={vi.fn()} onReset={vi.fn()} />)
  expect(screen.getByText('+ Add Room')).toBeInTheDocument()
})
