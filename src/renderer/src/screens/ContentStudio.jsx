import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import ScreenShell from '../components/ScreenShell'
import ModeSelector from './content/ModeSelector'
import LogPostForm from './content/LogPostForm'
import { colors } from '../theme'

const ACCOUNT_META = {
  'folded-steel':          { title: 'Folded Steel',          subtitle: '@foldedsteelkitchen — premium knife content' },
  'cook-travel-dad':       { title: 'Cook Travel Dad',       subtitle: 'Cooking, dad life & Weber Slate — IG + FB' },
  'from-points-to-travel': { title: 'From Points to Travel', subtitle: 'Luxury travel & credit card points — FB' },
  'furniture-flip':        { title: 'Furniture Flip',        subtitle: 'Free marketplace finds → $500-700 flips — IG + FB' },
  'propagate-iq':          { title: 'Propagate IQ',          subtitle: 'AI gardening app — downloads & brand awareness' },
  'reconnect-deck':        { title: 'Reconnect Deck',        subtitle: 'Conversation card deck — build launch anticipation' },
}

function UserBubble({ text }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
      <div style={{ maxWidth: '70%', backgroundColor: colors.card, border: `1px solid ${colors.border}`, borderRadius: '14px 14px 4px 14px', padding: '10px 14px' }}>
        <p style={{ margin: 0, color: colors.text, fontSize: '14px', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>{text}</p>
      </div>
    </div>
  )
}

function AssistantBubble({ text }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '16px' }}>
      <div style={{ maxWidth: '80%', backgroundColor: colors.bg, border: `1px solid ${colors.borderLight}`, borderRadius: '4px 14px 14px 14px', padding: '10px 14px' }}>
        <p style={{ margin: 0, color: colors.text, fontSize: '14px', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{text}</p>
      </div>
    </div>
  )
}

export default function ContentStudio() {
  const { account } = useParams()
  const meta = ACCOUNT_META[account] || { title: 'Content Studio', subtitle: '' }

  const [mode, setMode] = useState('chat')
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showLogPost, setShowLogPost] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const bottomRef = useRef(null)

  const loadSuggestions = useCallback(async () => {
    if (!account) return
    const list = await window.electronAPI.suggestions.list(account, 'suggested')
    setSuggestions(list)
  }, [account])

  useEffect(() => {
    setMessages([])
    setInput('')
    setError(null)
    setLoading(false)
    setMode('chat')
    setShowLogPost(false)
    loadSuggestions()
  }, [account, loadSuggestions])

  useEffect(() => {
    if (bottomRef.current?.scrollIntoView) bottomRef.current.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || loading) return

    const userMsg = { role: 'user', text }
    const nextMessages = [...messages, userMsg]
    setMessages(nextMessages)
    setInput('')
    setError(null)
    setLoading(true)

    try {
      const systemPrompt = await window.electronAPI.content.buildPrompt(account, mode)
      const result = await window.electronAPI.agent.chat(nextMessages, systemPrompt)
      setMessages((prev) => [...prev, { role: 'assistant', text: result.text }])
      await window.electronAPI.suggestions.add({ account, workflow: mode, content: result.text })
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

  const handleLogPost = async (data) => {
    await window.electronAPI.posts.add({ ...data, account })
    setShowLogPost(false)
    await loadSuggestions()
  }

  const headerRight = (
    <button
      onClick={() => setShowLogPost(!showLogPost)}
      style={{
        backgroundColor: colors.card,
        color: colors.text,
        border: `1px solid ${colors.border}`,
        borderRadius: '7px',
        padding: '7px 16px',
        fontSize: '12px',
        fontWeight: '500',
        cursor: 'pointer',
      }}
    >
      Log Post
    </button>
  )

  return (
    <ScreenShell title={meta.title} subtitle={meta.subtitle} headerRight={headerRight}>
      <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 160px)', minHeight: '400px' }}>

        <ModeSelector active={mode} onChange={setMode} />

        {showLogPost && (
          <LogPostForm
            onSave={handleLogPost}
            onCancel={() => setShowLogPost(false)}
            suggestions={suggestions}
          />
        )}

        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0 16px' }}>
          {messages.length === 0 && !loading && (
            <div style={{ textAlign: 'center', marginTop: '60px', color: colors.textMuted }}>
              <p style={{ fontSize: '14px', margin: 0 }}>
                {mode === 'chat' && 'Ask for content ideas, strategies, or feedback.'}
                {mode === 'analyze' && 'Ask me to analyze your post performance and find patterns.'}
                {mode === 'calendar' && 'Ask me to generate a weekly content plan.'}
                {mode === 'caption' && 'Give me a topic and I\'ll write a ready-to-post caption or script.'}
                {mode === 'monetize' && 'Ask me to review your metrics and suggest revenue actions.'}
              </p>
            </div>
          )}
          {messages.map((msg, i) =>
            msg.role === 'user'
              ? <UserBubble key={i} text={msg.text} />
              : <AssistantBubble key={i} text={msg.text} />
          )}
          {loading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '16px' }}>
              <div style={{ backgroundColor: colors.bg, border: `1px solid ${colors.borderLight}`, borderRadius: '4px 14px 14px 14px', padding: '10px 16px', color: colors.textSecondary, fontSize: '13px', fontStyle: 'italic' }}>
                Thinking...
              </div>
            </div>
          )}
          {error && (
            <div style={{ backgroundColor: colors.redBg, border: `1px solid ${colors.red}`, borderRadius: '8px', padding: '10px 14px', marginBottom: '12px', color: colors.red, fontSize: '13px' }}>
              {error}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask for a content idea, caption, or strategy…"
            rows={1}
            style={{ flex: 1, backgroundColor: colors.card, border: `1px solid ${colors.border}`, borderRadius: '10px', padding: '10px 14px', color: colors.text, fontSize: '14px', outline: 'none', resize: 'none', lineHeight: '1.5', fontFamily: 'inherit' }}
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            aria-label="Send"
            style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}`, borderRadius: '8px', color: colors.text, fontSize: '13px', fontWeight: '500', padding: '9px 16px', cursor: 'pointer', whiteSpace: 'nowrap', opacity: (loading || !input.trim()) ? 0.5 : 1 }}
          >
            Send
          </button>
        </div>

      </div>
    </ScreenShell>
  )
}
