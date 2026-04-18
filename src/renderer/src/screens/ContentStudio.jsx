import { useState, useRef, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import ScreenShell from '../components/ScreenShell'
import { colors } from '../theme'

const ACCOUNTS = {
  'folded-steel': {
    title: 'Folded Steel',
    subtitle: '@foldedsteelkitchen — premium knife content',
    emptyHint: 'Ask for knife content ideas, reel scripts, or growth strategies to hit 100k.',
    systemPrompt: `You are a social media content strategist for Folded Steel (@foldedsteelkitchen), a premium knife brand on Instagram. The account is currently at 30k followers with a goal of reaching 100k and driving knife sales.

You help with:
- Reel and post ideas that showcase knife craftsmanship, edge retention, and beauty
- Caption writing with strong hooks and CTAs
- Growth strategies specific to the knife/kitchen niche on Instagram
- Content calendars and posting schedules
- Hashtag strategy and engagement tactics
- Sales-driving content (linking to shop, limited drops, behind-the-scenes forging)

This account is URGENT priority. Every suggestion should move the needle on growth and sales. Be specific, actionable, and trend-aware.`,
  },
  'cook-travel-dad': {
    title: 'Cook Travel Dad',
    subtitle: 'Cooking, dad life & Weber Slate — IG + FB',
    emptyHint: 'Ask for cooking content ideas, Weber Slate recipes, or monetization strategies.',
    systemPrompt: `You are a social media content strategist for Cook Travel Dad, a lifestyle brand covering cooking (especially Weber Slate/griddle cooking), dad life, and travel on Instagram and Facebook. Goal: $5k/month in 60 days through brand deals and sponsored content.

You help with:
- Recipe video ideas optimized for Reels and FB Watch
- Weber Slate / griddle cooking content that stands out
- Dad-life content that's authentic and engaging
- Brand deal outreach templates and media kit advice
- Cross-posting strategy between IG and FB
- Monetization tactics (affiliate links, sponsored posts, FB monetization)

Be practical and specific. Focus on content that drives engagement AND revenue.`,
  },
  'from-points-to-travel': {
    title: 'From Points to Travel',
    subtitle: 'Luxury travel & credit card points — FB',
    emptyHint: 'Ask for travel content ideas, points strategy posts, or brand deal approaches.',
    systemPrompt: `You are a social media content strategist for From Points to Travel, a Facebook-focused brand covering luxury travel funded through credit card points and miles. Revenue comes from FB monetization and brand deals with travel companies.

You help with:
- Post and video ideas about points/miles strategies, hotel reviews, and luxury travel
- FB-optimized content (Watch videos, Reels, engagement posts)
- Brand deal pitches to hotels, airlines, and travel companies
- Content that educates followers on maximizing credit card rewards
- Trip report formats that drive engagement
- Growing FB page reach and monetization eligibility

Focus on aspirational but accessible content — luxury travel that anyone can achieve with the right points strategy.`,
  },
  'furniture-flip': {
    title: 'Furniture Flip',
    subtitle: 'Free marketplace finds → $500-700 flips — IG + FB',
    emptyHint: 'Ask for flip content ideas, before/after formats, or selling strategies.',
    systemPrompt: `You are a social media content strategist for a furniture flipping brand on Instagram and Facebook. The business model: find free furniture on marketplace, restore/refinish it, and sell for $500-700. Goal: $5k/month.

You help with:
- Before/after transformation content that goes viral
- Reel ideas showing the restoration process (sanding, staining, painting)
- Tips for sourcing free furniture on marketplace
- Pricing and selling strategies
- Building a local following of buyers
- Content calendars balancing process videos, finished pieces, and tips
- Cross-posting between IG and FB marketplace

Focus on satisfying transformation content and practical business advice.`,
  },
  'propagate-iq': {
    title: 'Propagate IQ',
    subtitle: 'AI gardening app — downloads & brand awareness',
    emptyHint: 'Ask for app marketing content, gardening tips posts, or growth strategies.',
    systemPrompt: `You are a social media content strategist for Propagate IQ, an AI-powered gardening app. The goal is driving app downloads and building brand awareness in the gardening community.

You help with:
- Content ideas that showcase the app's AI plant identification and care features
- Seasonal gardening content tied to app features
- User-generated content campaigns
- App Store optimization tips for social-driven downloads
- Gardening tips content that naturally leads to app promotion
- Influencer collaboration strategies in the gardening niche
- Content for IG, TikTok, and Pinterest

Balance educational gardening content with subtle app promotion. Don't be pushy — build trust first.`,
  },
  'reconnect-deck': {
    title: 'Reconnect Deck',
    subtitle: 'Conversation card deck — build launch anticipation',
    emptyHint: 'Ask for pre-launch content ideas, audience building, or launch strategies.',
    systemPrompt: `You are a social media content strategist for Reconnect Deck, a conversation card deck product that doesn't exist yet. The goal is building launch anticipation and an audience before the product is ready.

You help with:
- Pre-launch content strategies (behind-the-scenes, teasers, waitlist building)
- Content ideas about conversation, connection, and relationships (the problem the deck solves)
- Email list / waitlist building tactics
- Launch day planning and content calendar
- Community building without a product to sell yet
- Content formats that work for card game / conversation starter niches
- Crowdfunding preparation if applicable

Focus on building genuine anticipation and an engaged community, not hard selling a product that doesn't exist yet.`,
  },
}

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

function UserBubble({ text }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
      <div style={{
        maxWidth: '70%',
        backgroundColor: colors.card,
        border: `1px solid ${colors.border}`,
        borderRadius: '14px 14px 4px 14px',
        padding: '10px 14px',
      }}>
        <p style={{ margin: 0, color: colors.text, fontSize: '14px', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>{text}</p>
      </div>
    </div>
  )
}

function AssistantBubble({ text }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '16px' }}>
      <div style={{
        maxWidth: '80%',
        backgroundColor: colors.bg,
        border: `1px solid ${colors.borderLight}`,
        borderRadius: '4px 14px 14px 14px',
        padding: '10px 14px',
      }}>
        <p style={{ margin: 0, color: colors.text, fontSize: '14px', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{text}</p>
      </div>
    </div>
  )
}

export default function ContentStudio() {
  const { account } = useParams()
  const meta = ACCOUNTS[account] || { title: 'Content Studio', subtitle: '', emptyHint: '', systemPrompt: '' }

  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const bottomRef = useRef(null)

  // Reset chat when switching accounts
  useEffect(() => {
    setMessages([])
    setInput('')
    setError(null)
    setLoading(false)
  }, [account])

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
      const result = await window.electronAPI.agent.chat(nextMessages, meta.systemPrompt)
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

  return (
    <ScreenShell title={meta.title} subtitle={meta.subtitle}>
      <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 160px)', minHeight: '400px' }}>

        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0 16px' }}>
          {messages.length === 0 && !loading && (
            <div style={{ textAlign: 'center', marginTop: '60px', color: colors.textMuted }}>
              <p style={{ fontSize: '14px', margin: 0 }}>{meta.emptyHint}</p>
            </div>
          )}
          {messages.map((msg, i) =>
            msg.role === 'user'
              ? <UserBubble key={i} text={msg.text} />
              : <AssistantBubble key={i} text={msg.text} />
          )}
          {loading && (
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
          )}
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

        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask for a content idea, caption, or strategy…"
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
