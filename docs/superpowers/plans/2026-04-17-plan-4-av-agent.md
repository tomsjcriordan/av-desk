# Plan 4: AV Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the AV Agent screen — a Claude-powered chat with photo upload for AV gear questions. Users type questions, optionally attach a photo, and get expert AV tech answers.

**Architecture:** Claude API calls are made in the Electron main process (keeps API key off the renderer). The main process reads the `claudeApiKey` from electron-store, calls `@anthropic-ai/sdk` with the full message history (non-streaming for simplicity and testability), and returns the assistant message over IPC. Photo upload opens a native file dialog in the main process and returns base64 data to the renderer. Chat state lives entirely in the renderer (no SQLite persistence needed for this plan).

**Model:** `claude-opus-4-6` per project standard.

**Tech Stack:** `@anthropic-ai/sdk`, Electron IPC, React 18, Vitest

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `package.json` | Modify | Add `@anthropic-ai/sdk` dependency |
| `src/main/index.js` | Modify | Add `agent:chat` and `agent:selectImage` IPC handlers |
| `src/preload/index.js` | Modify | Expose `electronAPI.agent` bridge |
| `src/renderer/src/screens/AVAgent.jsx` | Replace | Full chat UI — message history, input, image upload, send |
| `tests/main/agent.test.js` | Create | Unit tests for main-process IPC handlers (mock SDK) |
| `tests/renderer/AVAgent.test.jsx` | Create | Component tests for chat screen |
| `tests/renderer/App.test.jsx` | Modify | Add `agent` mock to beforeEach |

---

## Data Shapes

**Message in chat history (renderer state):**
```js
{ role: 'user' | 'assistant', text: string, imageBase64?: string, imageMediaType?: string }
```

**IPC `agent:chat` payload:**
```js
// messages: array of {role, text, imageBase64?, imageMediaType?}
// Returns: { text: string } on success, or throws
```

**IPC `agent:selectImage` returns:**
```js
{ base64: string, mediaType: 'image/jpeg'|'image/png'|'image/gif'|'image/webp', name: string } | null
```

---

## AV Agent System Prompt

```
You are an expert AV (audio-visual) technician with deep knowledge of live event production, corporate AV, and conference room technology. You help with:
- Identifying and troubleshooting AV gear from photos
- Signal flow and connectivity (HDMI, DisplayPort, SDI, analog audio, Dante/AES67)
- Conference room setups and troubleshooting
- Corporate event and TED-style talk production
- AV networking and control systems (Crestron, AMX, QSC)

Keep responses practical and concise. When analyzing photos of gear, identify the equipment and provide relevant technical details.
```

---

## Task 1: Install @anthropic-ai/sdk

- [ ] **Step 1: Install the SDK**

```bash
cd /Users/tomfreekinr/av-desk && npm install @anthropic-ai/sdk
```

- [ ] **Step 2: Confirm installation**

```bash
cd /Users/tomfreekinr/av-desk && node -e "require('@anthropic-ai/sdk'); console.log('OK')"
```

Expected: `OK`

---

## Task 2: Main process IPC handlers (TDD)

**Files:**
- Modify: `src/main/index.js`
- Create: `tests/main/agent.test.js`

- [ ] **Step 1: Write failing tests**

Create `tests/main/agent.test.js`:

```js
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock @anthropic-ai/sdk BEFORE importing the handler
vi.mock('@anthropic-ai/sdk', () => {
  const mockCreate = vi.fn()
  return {
    default: vi.fn().mockImplementation(() => ({
      messages: { create: mockCreate },
    })),
    __mockCreate: mockCreate,
  }
})

// Mock electron-store
vi.mock('electron-store', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      get: vi.fn((key) => key === 'claudeApiKey' ? 'sk-ant-test' : undefined),
      set: vi.fn(),
      store: {},
    })),
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
import Anthropic from '@anthropic-ai/sdk'

describe('agent:chat handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls Claude API with user text message', async () => {
    const mockCreate = new Anthropic().messages.create
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
    const mockCreate = new Anthropic().messages.create
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'response' }],
    })

    await handleAgentChat([{ role: 'user', text: 'hello' }])

    const call = mockCreate.mock.calls[0][0]
    expect(call.system).toContain('AV')
  })

  it('builds multi-turn history correctly', async () => {
    const mockCreate = new Anthropic().messages.create
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'OK' }],
    })

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
    const mockCreate = new Anthropic().messages.create
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
    const { default: Store } = await import('electron-store')
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
  it('returns base64 and mediaType for a selected jpg', async () => {
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
```

- [ ] **Step 2: Run to confirm fail**

```bash
cd /Users/tomfreekinr/av-desk && npm test -- tests/main/agent.test.js
```

Expected: FAIL — module `src/main/agentHandlers` not found.

- [ ] **Step 3: Create src/main/agentHandlers.js**

```js
import Anthropic from '@anthropic-ai/sdk'
import Store from 'electron-store'
import { dialog } from 'electron'
import { readFileSync } from 'fs'
import { extname } from 'path'

const SYSTEM_PROMPT = `You are an expert AV (audio-visual) technician with deep knowledge of live event production, corporate AV, and conference room technology. You help with:
- Identifying and troubleshooting AV gear from photos
- Signal flow and connectivity (HDMI, DisplayPort, SDI, analog audio, Dante/AES67)
- Conference room setups and troubleshooting
- Corporate event and TED-style talk production
- AV networking and control systems (Crestron, AMX, QSC)

Keep responses practical and concise. When analyzing photos of gear, identify the equipment and provide relevant technical details.`

const MEDIA_TYPES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
}

function buildApiMessages(messages) {
  return messages.map((msg) => {
    if (msg.imageBase64 && msg.role === 'user') {
      return {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: msg.imageMediaType, data: msg.imageBase64 },
          },
          { type: 'text', text: msg.text },
        ],
      }
    }
    return {
      role: msg.role,
      content: [{ type: 'text', text: msg.text }],
    }
  })
}

export async function handleAgentChat(messages) {
  const store = new Store()
  const apiKey = store.get('claudeApiKey')
  if (!apiKey) throw new Error('Claude API key not set. Add it in Settings.')

  const client = new Anthropic({ apiKey })
  const response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: buildApiMessages(messages),
  })

  const textBlock = response.content.find((b) => b.type === 'text')
  return { text: textBlock?.text ?? '' }
}

export async function handleAgentSelectImage() {
  const result = await dialog.showOpenDialog({
    title: 'Select Photo',
    filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] }],
    properties: ['openFile'],
  })
  if (result.canceled || !result.filePaths.length) return null

  const filePath = result.filePaths[0]
  const ext = extname(filePath).toLowerCase()
  const mediaType = MEDIA_TYPES[ext] || 'image/jpeg'
  const data = readFileSync(filePath)
  return {
    base64: data.toString('base64'),
    mediaType,
    name: filePath.split('/').pop(),
  }
}
```

- [ ] **Step 4: Run tests and confirm they pass**

```bash
cd /Users/tomfreekinr/av-desk && npm test -- tests/main/agent.test.js
```

Expected: all 6 tests pass.

- [ ] **Step 5: Add agent IPC handlers to src/main/index.js**

Add to top of file (after existing imports):
```js
import { handleAgentChat, handleAgentSelectImage } from './agentHandlers'
```

Add IPC handlers (after the invoices handlers):
```js
// IPC: AV Agent
ipcMain.handle('agent:chat', (_e, messages) => handleAgentChat(messages))
ipcMain.handle('agent:selectImage', () => handleAgentSelectImage())
```

- [ ] **Step 6: Run full test suite**

```bash
cd /Users/tomfreekinr/av-desk && npm test
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
cd /Users/tomfreekinr/av-desk && git add src/main/agentHandlers.js src/main/index.js tests/main/agent.test.js && git commit -m "feat: add AV Agent IPC handlers and Claude API integration"
```

---

## Task 3: Preload bridge

**Files:**
- Modify: `src/preload/index.js`

- [ ] **Step 1: Add agent bridge to preload**

Append to the `contextBridge.exposeInMainWorld` object in `src/preload/index.js`:

```js
  agent: {
    chat: (messages) => ipcRenderer.invoke('agent:chat', messages),
    selectImage: () => ipcRenderer.invoke('agent:selectImage'),
  },
```

- [ ] **Step 2: Run full test suite**

```bash
cd /Users/tomfreekinr/av-desk && npm test
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
cd /Users/tomfreekinr/av-desk && git add src/preload/index.js && git commit -m "feat: expose agent IPC bridge in preload"
```

---

## Task 4: AVAgent screen (TDD)

**Files:**
- Replace: `src/renderer/src/screens/AVAgent.jsx`
- Create: `tests/renderer/AVAgent.test.jsx`
- Modify: `tests/renderer/App.test.jsx`

- [ ] **Step 1: Write failing AVAgent tests**

Create `tests/renderer/AVAgent.test.jsx`:

```jsx
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
  expect(screen.getByText(/ask me anything/i)).toBeInTheDocument()
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
```

- [ ] **Step 2: Run to confirm fail**

```bash
cd /Users/tomfreekinr/av-desk && npm test -- tests/renderer/AVAgent.test.jsx
```

Expected: FAIL — placeholder screen fails tests.

- [ ] **Step 3: Replace src/renderer/src/screens/AVAgent.jsx**

```jsx
import { useState, useRef, useEffect } from 'react'
import ScreenShell from '../components/ScreenShell'
import { colors } from '../theme'

const inputStyle = {
  flex: 1,
  backgroundColor: colors.card,
  border: `1px solid ${colors.border}`,
  borderRadius: '10px',
  padding: '10px 14px',
  color: colors.text,
  fontSize: '14px',
  outline: 'none',
  resize: 'none',
  lineHeight: '1.5',
  fontFamily: 'inherit',
}

const btnStyle = (primary) => ({
  backgroundColor: primary ? colors.card : 'transparent',
  border: `1px solid ${primary ? colors.border : colors.border}`,
  borderRadius: '8px',
  color: primary ? colors.text : colors.textSecondary,
  fontSize: '13px',
  fontWeight: '500',
  padding: '9px 16px',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
})

function UserBubble({ msg }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
      <div style={{
        maxWidth: '70%',
        backgroundColor: colors.card,
        border: `1px solid ${colors.border}`,
        borderRadius: '14px 14px 4px 14px',
        padding: '10px 14px',
      }}>
        {msg.imageBase64 && (
          <img
            src={`data:${msg.imageMediaType};base64,${msg.imageBase64}`}
            alt="attached"
            style={{ width: '100%', maxWidth: '260px', borderRadius: '8px', marginBottom: '8px', display: 'block' }}
          />
        )}
        <p style={{ margin: 0, color: colors.text, fontSize: '14px', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>{msg.text}</p>
      </div>
    </div>
  )
}

function AssistantBubble({ msg }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '16px' }}>
      <div style={{
        maxWidth: '80%',
        backgroundColor: colors.bg,
        border: `1px solid ${colors.borderLight}`,
        borderRadius: '4px 14px 14px 14px',
        padding: '10px 14px',
      }}>
        <p style={{ margin: 0, color: colors.text, fontSize: '14px', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{msg.text}</p>
      </div>
    </div>
  )
}

function ThinkingBubble() {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '16px' }}>
      <div style={{
        backgroundColor: colors.bg,
        border: `1px solid ${colors.borderLight}`,
        borderRadius: '4px 14px 14px 14px',
        padding: '10px 16px',
        color: colors.textSecondary,
        fontSize: '13px',
        fontStyle: 'italic',
      }}>
        Thinking...
      </div>
    </div>
  )
}

export default function AVAgent() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [pendingImage, setPendingImage] = useState(null) // { base64, mediaType, name }
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || loading) return

    const userMsg = { role: 'user', text }
    if (pendingImage) {
      userMsg.imageBase64 = pendingImage.base64
      userMsg.imageMediaType = pendingImage.mediaType
    }

    const nextMessages = [...messages, userMsg]
    setMessages(nextMessages)
    setInput('')
    setPendingImage(null)
    setError(null)
    setLoading(true)

    try {
      const result = await window.electronAPI.agent.chat(nextMessages)
      setMessages((prev) => [...prev, { role: 'assistant', text: result.text }])
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handlePhoto = async () => {
    const result = await window.electronAPI.agent.selectImage()
    if (result) setPendingImage(result)
  }

  return (
    <ScreenShell title="AV Agent" subtitle="Ask me anything about AV gear, signal flow, or troubleshooting">
      <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 160px)', minHeight: '400px' }}>

        {/* Message area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0 16px' }}>
          {messages.length === 0 && !loading && (
            <div style={{ textAlign: 'center', marginTop: '60px', color: colors.textMuted }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚡</div>
              <p style={{ fontSize: '14px', margin: 0 }}>Ask me anything about AV gear, signal flow, or troubleshooting.</p>
              <p style={{ fontSize: '12px', marginTop: '6px', color: colors.textMuted }}>You can attach a photo of gear to identify it.</p>
            </div>
          )}
          {messages.map((msg, i) =>
            msg.role === 'user'
              ? <UserBubble key={i} msg={msg} />
              : <AssistantBubble key={i} msg={msg} />
          )}
          {loading && <ThinkingBubble />}
          {error && (
            <div style={{
              backgroundColor: colors.redBg,
              border: `1px solid ${colors.red}`,
              borderRadius: '8px',
              padding: '10px 14px',
              marginBottom: '12px',
              color: colors.red,
              fontSize: '13px',
            }}>
              {error}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Pending image badge */}
        {pendingImage && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 10px',
            backgroundColor: colors.card,
            border: `1px solid ${colors.border}`,
            borderRadius: '8px',
            marginBottom: '8px',
            fontSize: '12px',
            color: colors.textSecondary,
          }}>
            <span>📎</span>
            <span>{pendingImage.name}</span>
            <button
              onClick={() => setPendingImage(null)}
              style={{ background: 'none', border: 'none', color: colors.red, cursor: 'pointer', fontSize: '14px', marginLeft: 'auto', padding: '0 4px' }}
            >
              ×
            </button>
          </div>
        )}

        {/* Input row */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
          <button
            onClick={handlePhoto}
            disabled={loading}
            aria-label="Photo"
            style={{
              ...btnStyle(false),
              padding: '9px 12px',
              fontSize: '18px',
              opacity: loading ? 0.5 : 1,
            }}
          >
            📷
          </button>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about AV gear…"
            rows={1}
            style={inputStyle}
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            aria-label="Send"
            style={{
              ...btnStyle(true),
              opacity: (loading || !input.trim()) ? 0.5 : 1,
            }}
          >
            Send
          </button>
        </div>

      </div>
    </ScreenShell>
  )
}
```

- [ ] **Step 4: Update App.test.jsx to include agent mock**

Read `tests/renderer/App.test.jsx`, add to the `beforeEach` mock:
```js
    agent: {
      chat: vi.fn().mockResolvedValue({ text: 'response' }),
      selectImage: vi.fn().mockResolvedValue(null),
    },
```

- [ ] **Step 5: Run AVAgent tests**

```bash
cd /Users/tomfreekinr/av-desk && npm test -- tests/renderer/AVAgent.test.jsx
```

Expected: all 9 tests pass.

- [ ] **Step 6: Run full test suite**

```bash
cd /Users/tomfreekinr/av-desk && npm test
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
cd /Users/tomfreekinr/av-desk && git add src/renderer/src/screens/AVAgent.jsx tests/renderer/AVAgent.test.jsx tests/renderer/App.test.jsx && git commit -m "feat: complete AV Agent screen — Claude chat with photo upload"
```

---

## Spec Coverage Self-Review

| Requirement | Covered by |
|-------------|-----------|
| Claude chat for AV gear questions | Tasks 2, 4 |
| Photo upload for gear identification | Tasks 2 (selectImage IPC), 4 (UI) |
| API key from Settings | Task 2 (reads claudeApiKey from store) |
| Expert AV system prompt | Task 2 (SYSTEM_PROMPT constant) |
| Multi-turn conversation history | Tasks 2, 4 |
| Loading / error states | Task 4 |
| Image preview in chat | Task 4 (UserBubble with base64) |
