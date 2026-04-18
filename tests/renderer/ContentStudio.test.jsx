import { it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import ContentStudio from '../../src/renderer/src/screens/ContentStudio'

function renderWithRoute(account) {
  return render(
    <MemoryRouter initialEntries={[`/content/${account}`]}>
      <Routes>
        <Route path="/content/:account" element={<ContentStudio />} />
      </Routes>
    </MemoryRouter>
  )
}

beforeEach(() => {
  window.electronAPI = {
    agent: {
      chat: vi.fn().mockResolvedValue({ text: 'Post a reel showing the knife edge glinting in natural light.' }),
    },
  }
})

it('renders Folded Steel title for folded-steel route', () => {
  renderWithRoute('folded-steel')
  expect(screen.getByText('Folded Steel')).toBeInTheDocument()
})

it('renders Cook Travel Dad title', () => {
  renderWithRoute('cook-travel-dad')
  expect(screen.getByText('Cook Travel Dad')).toBeInTheDocument()
})

it('shows chat input and send button', () => {
  renderWithRoute('folded-steel')
  expect(screen.getByPlaceholderText(/content idea/i)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument()
})

it('shows account-specific empty state', () => {
  renderWithRoute('folded-steel')
  expect(screen.getByText(/knife content ideas/i)).toBeInTheDocument()
})

it('sends message and shows response', async () => {
  renderWithRoute('folded-steel')
  const input = screen.getByPlaceholderText(/content idea/i)
  fireEvent.change(input, { target: { value: 'Give me a reel idea' } })
  fireEvent.click(screen.getByRole('button', { name: /send/i }))
  await waitFor(() => {
    expect(screen.getByText('Give me a reel idea')).toBeInTheDocument()
    expect(screen.getByText(/knife edge glinting/i)).toBeInTheDocument()
  })
})

it('calls agent.chat with account-specific system prompt', async () => {
  renderWithRoute('folded-steel')
  const input = screen.getByPlaceholderText(/content idea/i)
  fireEvent.change(input, { target: { value: 'hello' } })
  fireEvent.click(screen.getByRole('button', { name: /send/i }))
  await waitFor(() => {
    expect(window.electronAPI.agent.chat).toHaveBeenCalledWith(
      expect.any(Array),
      expect.stringContaining('Folded Steel')
    )
  })
})

it('shows loading state while waiting', async () => {
  let resolve
  window.electronAPI.agent.chat = vi.fn(() => new Promise((r) => { resolve = r }))
  renderWithRoute('folded-steel')
  const input = screen.getByPlaceholderText(/content idea/i)
  fireEvent.change(input, { target: { value: 'hello' } })
  fireEvent.click(screen.getByRole('button', { name: /send/i }))
  expect(screen.getByText(/thinking/i)).toBeInTheDocument()
  resolve({ text: 'response' })
  await waitFor(() => expect(screen.queryByText(/thinking/i)).not.toBeInTheDocument())
})

it('shows error when API fails', async () => {
  window.electronAPI.agent.chat = vi.fn().mockRejectedValue(new Error('No API key'))
  renderWithRoute('folded-steel')
  const input = screen.getByPlaceholderText(/content idea/i)
  fireEvent.change(input, { target: { value: 'hello' } })
  fireEvent.click(screen.getByRole('button', { name: /send/i }))
  await waitFor(() => expect(screen.getByText(/No API key/i)).toBeInTheDocument())
})
