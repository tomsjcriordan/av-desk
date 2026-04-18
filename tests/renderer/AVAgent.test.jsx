import { it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import AVAgent from '../../src/renderer/src/screens/AVAgent'

beforeEach(() => {
  window.electronAPI = {
    agent: {
      chat: vi.fn().mockResolvedValue({ text: 'HDMI 2.1 supports 48Gbps.' }),
      selectImage: vi.fn().mockResolvedValue(null),
    },
  }
})

it('renders empty chat with input and send button', () => {
  render(<AVAgent />)
  expect(screen.getByPlaceholderText(/ask anything/i)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument()
})

it('shows photo button', () => {
  render(<AVAgent />)
  expect(screen.getByRole('button', { name: /photo/i })).toBeInTheDocument()
})

it('shows empty state message when no messages', () => {
  render(<AVAgent />)
  expect(screen.getByText(/what AV question/i)).toBeInTheDocument()
})

it('sends message and shows user + assistant messages', async () => {
  render(<AVAgent />)
  const input = screen.getByPlaceholderText(/ask anything/i)
  fireEvent.change(input, { target: { value: 'What is HDMI 2.1?' } })
  fireEvent.click(screen.getByRole('button', { name: /send/i }))
  await waitFor(() => {
    expect(screen.getByText('What is HDMI 2.1?')).toBeInTheDocument()
    expect(screen.getByText('HDMI 2.1 supports 48Gbps.')).toBeInTheDocument()
  })
})

it('clears input after send', async () => {
  render(<AVAgent />)
  const input = screen.getByPlaceholderText(/ask anything/i)
  fireEvent.change(input, { target: { value: 'hello' } })
  fireEvent.click(screen.getByRole('button', { name: /send/i }))
  await waitFor(() => expect(input.value).toBe(''))
})

it('calls agent.chat with correct message history', async () => {
  render(<AVAgent />)
  const input = screen.getByPlaceholderText(/ask anything/i)
  fireEvent.change(input, { target: { value: 'What is SDI?' } })
  fireEvent.click(screen.getByRole('button', { name: /send/i }))
  await waitFor(() => {
    expect(window.electronAPI.agent.chat).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ role: 'user', text: 'What is SDI?' }),
      ])
    )
  })
})

it('shows loading state while waiting for response', async () => {
  let resolve
  window.electronAPI.agent.chat = vi.fn(() => new Promise((r) => { resolve = r }))
  render(<AVAgent />)
  const input = screen.getByPlaceholderText(/ask anything/i)
  fireEvent.change(input, { target: { value: 'hello' } })
  fireEvent.click(screen.getByRole('button', { name: /send/i }))
  expect(screen.getByText(/thinking/i)).toBeInTheDocument()
  resolve({ text: 'response' })
  await waitFor(() => expect(screen.queryByText(/thinking/i)).not.toBeInTheDocument())
})

it('shows error message when API call fails', async () => {
  window.electronAPI.agent.chat = vi.fn().mockRejectedValue(new Error('API key not set'))
  render(<AVAgent />)
  const input = screen.getByPlaceholderText(/ask anything/i)
  fireEvent.change(input, { target: { value: 'hello' } })
  fireEvent.click(screen.getByRole('button', { name: /send/i }))
  await waitFor(() => expect(screen.getByText(/API key not set/i)).toBeInTheDocument())
})

it('calls selectImage when photo button clicked', async () => {
  render(<AVAgent />)
  fireEvent.click(screen.getByRole('button', { name: /photo/i }))
  await waitFor(() => expect(window.electronAPI.agent.selectImage).toHaveBeenCalled())
})

it('shows attached image name after photo selected', async () => {
  window.electronAPI.agent.selectImage = vi.fn().mockResolvedValue({
    base64: 'abc123',
    mediaType: 'image/jpeg',
    name: 'switcher.jpg',
  })
  render(<AVAgent />)
  fireEvent.click(screen.getByRole('button', { name: /photo/i }))
  await waitFor(() => expect(screen.getByText('switcher.jpg')).toBeInTheDocument())
})
