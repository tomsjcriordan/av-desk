import { it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ModeSelector from '../../src/renderer/src/screens/content/ModeSelector'

it('renders all 5 mode tabs', () => {
  render(<ModeSelector active="chat" onChange={vi.fn()} />)
  expect(screen.getByText('Chat')).toBeInTheDocument()
  expect(screen.getByText('Analyze')).toBeInTheDocument()
  expect(screen.getByText('Calendar')).toBeInTheDocument()
  expect(screen.getByText('Caption')).toBeInTheDocument()
  expect(screen.getByText('Monetize')).toBeInTheDocument()
})

it('highlights the active mode', () => {
  render(<ModeSelector active="analyze" onChange={vi.fn()} />)
  const analyzeBtn = screen.getByText('Analyze')
  expect(analyzeBtn.style.borderBottomColor).not.toBe('transparent')
})

it('calls onChange when a tab is clicked', () => {
  const onChange = vi.fn()
  render(<ModeSelector active="chat" onChange={onChange} />)
  fireEvent.click(screen.getByText('Calendar'))
  expect(onChange).toHaveBeenCalledWith('calendar')
})

it('does not call onChange when active tab clicked', () => {
  const onChange = vi.fn()
  render(<ModeSelector active="chat" onChange={onChange} />)
  fireEvent.click(screen.getByText('Chat'))
  expect(onChange).not.toHaveBeenCalled()
})
