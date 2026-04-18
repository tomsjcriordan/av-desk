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

export async function handleAgentChat(messages, systemPrompt) {
  const store = new Store()
  const apiKey = store.get('claudeApiKey')
  if (!apiKey) throw new Error('Claude API key not set. Add it in Settings.')

  const client = new Anthropic({ apiKey })
  const response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 4096,
    system: systemPrompt || SYSTEM_PROMPT,
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
