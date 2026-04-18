import { it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import LogPostForm from '../../src/renderer/src/screens/content/LogPostForm'

const suggestions = [
  { id: 1, content: 'Post a reel showing knife edge', workflow: 'caption', status: 'suggested' },
  { id: 2, content: 'Try a carousel of knife types', workflow: 'calendar', status: 'suggested' },
]

it('renders all required fields', () => {
  render(<LogPostForm onSave={vi.fn()} onCancel={vi.fn()} suggestions={suggestions} />)
  expect(screen.getByLabelText('Platform')).toBeInTheDocument()
  expect(screen.getByLabelText('Post Type')).toBeInTheDocument()
  expect(screen.getByLabelText('Title')).toBeInTheDocument()
  expect(screen.getByLabelText('Posted Date')).toBeInTheDocument()
  expect(screen.getByLabelText('Views')).toBeInTheDocument()
  expect(screen.getByLabelText('Likes')).toBeInTheDocument()
  expect(screen.getByLabelText('Saves')).toBeInTheDocument()
  expect(screen.getByLabelText('Shares')).toBeInTheDocument()
  expect(screen.getByLabelText('Comments')).toBeInTheDocument()
})

it('renders optional fields', () => {
  render(<LogPostForm onSave={vi.fn()} onCancel={vi.fn()} suggestions={suggestions} />)
  expect(screen.getByLabelText('Caption')).toBeInTheDocument()
  expect(screen.getByLabelText('Watch Time (avg sec)')).toBeInTheDocument()
  expect(screen.getByLabelText('Revenue ($)')).toBeInTheDocument()
  expect(screen.getByLabelText('Linked Suggestion')).toBeInTheDocument()
  expect(screen.getByLabelText('Notes')).toBeInTheDocument()
})

it('defaults posted date to today', () => {
  render(<LogPostForm onSave={vi.fn()} onCancel={vi.fn()} suggestions={[]} />)
  const today = new Date().toISOString().slice(0, 10)
  expect(screen.getByLabelText('Posted Date').value).toBe(today)
})

it('shows suggestions in dropdown', () => {
  render(<LogPostForm onSave={vi.fn()} onCancel={vi.fn()} suggestions={suggestions} />)
  const select = screen.getByLabelText('Linked Suggestion')
  expect(select.options).toHaveLength(3) // "None" + 2 suggestions
})

it('calls onSave with correct shape', async () => {
  const onSave = vi.fn()
  render(<LogPostForm onSave={onSave} onCancel={vi.fn()} suggestions={[]} />)
  fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Edge glint reel' } })
  fireEvent.change(screen.getByLabelText('Views'), { target: { value: '45000' } })
  fireEvent.change(screen.getByLabelText('Likes'), { target: { value: '3200' } })
  fireEvent.change(screen.getByLabelText('Saves'), { target: { value: '2100' } })
  fireEvent.change(screen.getByLabelText('Shares'), { target: { value: '890' } })
  fireEvent.change(screen.getByLabelText('Comments'), { target: { value: '340' } })
  fireEvent.click(screen.getByText('Save Post'))
  await waitFor(() => {
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Edge glint reel',
        views: 45000,
        likes: 3200,
        platform: 'instagram',
        post_type: 'reel',
      })
    )
  })
})

it('calls onCancel when Cancel clicked', () => {
  const onCancel = vi.fn()
  render(<LogPostForm onSave={vi.fn()} onCancel={onCancel} suggestions={[]} />)
  fireEvent.click(screen.getByText('Cancel'))
  expect(onCancel).toHaveBeenCalled()
})
