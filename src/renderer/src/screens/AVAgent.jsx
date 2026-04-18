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
  border: `1px solid ${colors.border}`,
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
  const [pendingImage, setPendingImage] = useState(null)
  const bottomRef = useRef(null)

  useEffect(() => {
    if (bottomRef.current?.scrollIntoView) bottomRef.current.scrollIntoView({ behavior: 'smooth' })
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
              <p style={{ fontSize: '14px', margin: 0 }}>What AV question can I help with?</p>
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
