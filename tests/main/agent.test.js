// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

// vi.hoisted ensures these are available when vi.mock factories run (hoisted above imports)
const { mockCreate, mockShowOpenDialog, mockReadFileSync } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockShowOpenDialog: vi.fn(),
  mockReadFileSync: vi.fn(),
}))

let storeApiKey = 'sk-ant-test'

vi.mock('@anthropic-ai/sdk', () => ({
  default: class MockAnthropic {
    constructor() { this.messages = { create: mockCreate } }
  },
}))

vi.mock('electron-store', () => ({
  default: class MockStore {
    get(key) { return key === 'claudeApiKey' ? storeApiKey : undefined }
    set() {}
  },
}))

vi.mock('electron', () => ({
  dialog: { showOpenDialog: mockShowOpenDialog },
}))

vi.mock('fs', () => ({
  readFileSync: mockReadFileSync,
}))

import { handleAgentChat, handleAgentSelectImage } from '../../src/main/agentHandlers'

describe('agent:chat handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    storeApiKey = 'sk-ant-test'
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'Default response' }],
    })
  })

  it('calls Claude API with user text message', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'HDMI 2.1 supports 48Gbps bandwidth.' }],
    })

    const result = await handleAgentChat([{ role: 'user', text: 'What bandwidth does HDMI 2.1 support?' }])

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

  it('includes AV system prompt', async () => {
    await handleAgentChat([{ role: 'user', text: 'hello' }])
    expect(mockCreate.mock.calls[0][0].system).toContain('AV')
  })

  it('builds multi-turn history correctly', async () => {
    await handleAgentChat([
      { role: 'user', text: 'Question 1' },
      { role: 'assistant', text: 'Answer 1' },
      { role: 'user', text: 'Question 2' },
    ])

    const call = mockCreate.mock.calls[0][0]
    expect(call.messages).toHaveLength(3)
    expect(call.messages[0]).toEqual({ role: 'user', content: [{ type: 'text', text: 'Question 1' }] })
    expect(call.messages[1]).toEqual({ role: 'assistant', content: [{ type: 'text', text: 'Answer 1' }] })
  })

  it('includes image in user message when imageBase64 provided', async () => {
    await handleAgentChat([{
      role: 'user',
      text: 'What is this?',
      imageBase64: 'abc123',
      imageMediaType: 'image/jpeg',
    }])

    const userMsg = mockCreate.mock.calls[0][0].messages[0]
    expect(userMsg.content).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'image' }),
        expect.objectContaining({ type: 'text', text: 'What is this?' }),
      ])
    )
  })

  it('throws when API key is missing', async () => {
    storeApiKey = ''
    await expect(handleAgentChat([{ role: 'user', text: 'hi' }]))
      .rejects.toThrow(/API key/)
  })
})

describe('agent:selectImage handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns base64 and mediaType for a selected jpg', async () => {
    mockShowOpenDialog.mockResolvedValue({ canceled: false, filePaths: ['/tmp/photo.jpg'] })
    mockReadFileSync.mockReturnValue(Buffer.from('fake-image-data'))

    const result = await handleAgentSelectImage()
    expect(result).not.toBeNull()
    expect(result.base64).toBeDefined()
    expect(result.mediaType).toBe('image/jpeg')
    expect(result.name).toBe('photo.jpg')
  })

  it('returns null when dialog is cancelled', async () => {
    mockShowOpenDialog.mockResolvedValue({ canceled: true, filePaths: [] })
    const result = await handleAgentSelectImage()
    expect(result).toBeNull()
  })
})
