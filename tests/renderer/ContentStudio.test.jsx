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
      chat: vi.fn().mockResolvedValue({ text: 'Post a reel showing the knife edge glinting.' }),
    },
    content: {
      buildPrompt: vi.fn().mockResolvedValue('You are an expert...'),
    },
    posts: {
      list: vi.fn().mockResolvedValue([]),
      add: vi.fn().mockResolvedValue({ id: 1 }),
      stats: vi.fn().mockResolvedValue({ totalPosts: 0, avgViews: 0, topPosts: [], byType: {} }),
    },
    suggestions: {
      list: vi.fn().mockResolvedValue([]),
      add: vi.fn().mockResolvedValue({ id: 1, account: 'folded-steel', workflow: 'chat', content: 'test', status: 'suggested' }),
    },
  }
})

it('renders account title', async () => {
  renderWithRoute('folded-steel')
  await waitFor(() => expect(screen.getByText('Folded Steel')).toBeInTheDocument())
})

it('shows mode selector tabs', async () => {
  renderWithRoute('folded-steel')
  await waitFor(() => {
    expect(screen.getByText('Chat')).toBeInTheDocument()
    expect(screen.getByText('Analyze')).toBeInTheDocument()
    expect(screen.getByText('Calendar')).toBeInTheDocument()
    expect(screen.getByText('Caption')).toBeInTheDocument()
    expect(screen.getByText('Monetize')).toBeInTheDocument()
  })
})

it('shows Log Post button', async () => {
  renderWithRoute('folded-steel')
  await waitFor(() => expect(screen.getByText('Log Post')).toBeInTheDocument())
})

it('shows LogPostForm when Log Post clicked', async () => {
  renderWithRoute('folded-steel')
  await waitFor(() => fireEvent.click(screen.getByText('Log Post')))
  expect(screen.getByLabelText('Platform')).toBeInTheDocument()
})

it('sends message and shows response', async () => {
  renderWithRoute('folded-steel')
  await waitFor(() => {})
  const input = screen.getByPlaceholderText(/content idea/i)
  fireEvent.change(input, { target: { value: 'Give me a reel idea' } })
  fireEvent.click(screen.getByRole('button', { name: /send/i }))
  await waitFor(() => {
    expect(screen.getByText('Give me a reel idea')).toBeInTheDocument()
    expect(screen.getByText(/knife edge glinting/i)).toBeInTheDocument()
  })
})

it('calls content.buildPrompt with account and mode', async () => {
  renderWithRoute('folded-steel')
  await waitFor(() => {})
  const input = screen.getByPlaceholderText(/content idea/i)
  fireEvent.change(input, { target: { value: 'hello' } })
  fireEvent.click(screen.getByRole('button', { name: /send/i }))
  await waitFor(() => {
    expect(window.electronAPI.content.buildPrompt).toHaveBeenCalledWith('folded-steel', 'chat')
  })
})

it('saves suggestion after agent responds', async () => {
  renderWithRoute('folded-steel')
  await waitFor(() => {})
  const input = screen.getByPlaceholderText(/content idea/i)
  fireEvent.change(input, { target: { value: 'hello' } })
  fireEvent.click(screen.getByRole('button', { name: /send/i }))
  await waitFor(() => {
    expect(window.electronAPI.suggestions.add).toHaveBeenCalledWith(
      expect.objectContaining({
        account: 'folded-steel',
        workflow: 'chat',
      })
    )
  })
})

it('switches mode when tab clicked', async () => {
  renderWithRoute('folded-steel')
  await waitFor(() => fireEvent.click(screen.getByText('Analyze')))
  const input = screen.getByPlaceholderText(/content idea/i)
  fireEvent.change(input, { target: { value: 'analyze my posts' } })
  fireEvent.click(screen.getByRole('button', { name: /send/i }))
  await waitFor(() => {
    expect(window.electronAPI.content.buildPrompt).toHaveBeenCalledWith('folded-steel', 'analyze')
  })
})

it('shows loading state while waiting', async () => {
  let resolve
  window.electronAPI.agent.chat = vi.fn(() => new Promise((r) => { resolve = r }))
  renderWithRoute('folded-steel')
  await waitFor(() => {})
  const input = screen.getByPlaceholderText(/content idea/i)
  fireEvent.change(input, { target: { value: 'hello' } })
  fireEvent.click(screen.getByRole('button', { name: /send/i }))
  await waitFor(() => expect(screen.getByText(/thinking/i)).toBeInTheDocument())
  await waitFor(() => expect(resolve).toBeDefined())
  resolve({ text: 'response' })
  await waitFor(() => expect(screen.queryByText(/thinking/i)).not.toBeInTheDocument())
})

it('keeps messages when switching modes', async () => {
  renderWithRoute('folded-steel')
  await waitFor(() => {})
  const input = screen.getByPlaceholderText(/content idea/i)
  fireEvent.change(input, { target: { value: 'Give me a reel idea' } })
  fireEvent.click(screen.getByRole('button', { name: /send/i }))
  await waitFor(() => expect(screen.getByText(/knife edge glinting/i)).toBeInTheDocument())
  fireEvent.click(screen.getByText('Calendar'))
  expect(screen.getByText('Give me a reel idea')).toBeInTheDocument()
  expect(screen.getByText(/knife edge glinting/i)).toBeInTheDocument()
})

it('shows error when API fails', async () => {
  window.electronAPI.agent.chat = vi.fn().mockRejectedValue(new Error('No API key'))
  renderWithRoute('folded-steel')
  await waitFor(() => {})
  const input = screen.getByPlaceholderText(/content idea/i)
  fireEvent.change(input, { target: { value: 'hello' } })
  fireEvent.click(screen.getByRole('button', { name: /send/i }))
  await waitFor(() => expect(screen.getByText(/No API key/i)).toBeInTheDocument())
})
