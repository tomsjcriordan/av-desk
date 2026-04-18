// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock @anthropic-ai/sdk BEFORE importing the handler
const mockCreate = vi.fn()
vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      messages: { create: mockCreate },
    })),
  }
})

// Mock electron-store — must use `function` keyword so it works as a constructor
let mockStoreGet = (key) => key === 'claudeApiKey' ? 'sk-ant-test' : undefined
vi.mock('electron-store', () => {
  return {
    default: vi.fn().mockImplementation(function () {
      this.get = vi.fn((key) => mockStoreGet(key))
      this.set = vi.fn()
      this.store = {}
    }),
  }
})

// Mock electron dialog
vi.mock('electron', () => ({
  app: { getPath: vi.fn(() => ':memory:'), whenReady: vi.fn(() => Promise.resolve()), on: vi.fn() },
  BrowserWindow: vi.fn(),
  ipcMain: { handle: vi.fn(), on: vi.fn() },
  dialog: {
    showOpenDialog: vi.fn().mockResolvedValue({ canceled: false, filePaths: ['/tmp/photo.jpg'] }),
  },
}))

// Mock fs for readFileSync
vi.mock('fs', () => ({
  readFileSync: vi.fn(() => Buffer.from('fake-image-data')),
}))

import { handleAgentChat, handleAgentSelectImage } from '../../src/main/agentHandlers'

describe('agent:chat handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Re-setup default mock after clearAllMocks
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'Default response' }],
    })
  })

  it('calls Claude API with user text message', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'HDMI 2.1 supports 48Gbps bandwidth.' }],
    })

    const messages = [{ role: 'user', text: 'What bandwidth does HDMI 2.1 support?' }]
    const result = await handleAgentChat(messages)

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'claude-opus-4-6',
        messages: expect.arrayContaining([
          expect.objectContaining({ role: 'user' }),
        ]),
      })
    )
    expect(result.text).toBe('HDMI 2.1 supports 48Gbps bandwidth.')
  })

  it('includes system prompt', async () => {
    await handleAgentChat([{ role: 'user', text: 'hello' }])

    const call = mockCreate.mock.calls[0][0]
    expect(call.system).toContain('AV')
  })

  it('builds multi-turn history correctly', async () => {
    const messages = [
      { role: 'user', text: 'Question 1' },
      { role: 'assistant', text: 'Answer 1' },
      { role: 'user', text: 'Question 2' },
    ]
    await handleAgentChat(messages)

    const call = mockCreate.mock.calls[0][0]
    expect(call.messages).toHaveLength(3)
    expect(call.messages[0]).toEqual({ role: 'user', content: [{ type: 'text', text: 'Question 1' }] })
    expect(call.messages[1]).toEqual({ role: 'assistant', content: [{ type: 'text', text: 'Answer 1' }] })
  })

  it('includes image in user message when imageBase64 provided', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'That is an Extron switcher.' }],
    })

    const messages = [{
      role: 'user',
      text: 'What is this?',
      imageBase64: 'abc123',
      imageMediaType: 'image/jpeg',
    }]
    await handleAgentChat(messages)

    const call = mockCreate.mock.calls[0][0]
    const userMsg = call.messages[0]
    expect(userMsg.content).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'image' }),
        expect.objectContaining({ type: 'text', text: 'What is this?' }),
      ])
    )
  })

  it('throws meaningful error when API key is missing', async () => {
    const Store = (await import('electron-store')).default
    Store.mockImplementationOnce(() => ({
      get: vi.fn(() => ''),
      set: vi.fn(),
      store: {},
    }))

    await expect(handleAgentChat([{ role: 'user', text: 'hi' }]))
      .rejects.toThrow(/API key/)
  })
})

describe('agent:selectImage handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns base64 and mediaType for a selected jpg', async () => {
    const { dialog } = await import('electron')
    dialog.showOpenDialog.mockResolvedValue({ canceled: false, filePaths: ['/tmp/photo.jpg'] })
    const { readFileSync } = await import('fs')
    readFileSync.mockReturnValue(Buffer.from('fake-image-data'))

    const result = await handleAgentSelectImage()
    expect(result).not.toBeNull()
    expect(result.base64).toBeDefined()
    expect(result.mediaType).toBe('image/jpeg')
  })

  it('returns null when dialog is cancelled', async () => {
    const { dialog } = await import('electron')
    dialog.showOpenDialog.mockResolvedValueOnce({ canceled: true, filePaths: [] })
    const result = await handleAgentSelectImage()
    expect(result).toBeNull()
  })
})
