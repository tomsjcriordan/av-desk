import { it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import GuideSteps from '../../src/renderer/src/screens/filedist/GuideSteps'

it('renders all 5 step titles', () => {
  render(<GuideSteps />)
  expect(screen.getByText(/connect to venue network/i)).toBeInTheDocument()
  expect(screen.getByText(/enable sharing on windows/i)).toBeInTheDocument()
  expect(screen.getByText(/connect from mac/i)).toBeInTheDocument()
  expect(screen.getByText(/copy files/i)).toBeInTheDocument()
  expect(screen.getByText(/verify.*delivered/i)).toBeInTheDocument()
})

it('shows step numbers', () => {
  render(<GuideSteps />)
  expect(screen.getByText('1')).toBeInTheDocument()
  expect(screen.getByText('5')).toBeInTheDocument()
})

it('expands a step when clicked to show details', () => {
  render(<GuideSteps />)
  fireEvent.click(screen.getByText(/connect to venue network/i))
  expect(screen.getByText(/system preferences/i)).toBeInTheDocument()
})

it('collapses an expanded step when clicked again', () => {
  render(<GuideSteps />)
  fireEvent.click(screen.getByText(/connect to venue network/i))
  expect(screen.getByText(/system preferences/i)).toBeInTheDocument()
  fireEvent.click(screen.getByText(/connect to venue network/i))
  expect(screen.queryByText(/system preferences/i)).not.toBeInTheDocument()
})
