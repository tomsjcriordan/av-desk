/**
 * 4-layer prompt builder for Content Studio
 * Layers: Base (shared expertise) → Account (context) → Mode (workflow) → Performance (auto-injected)
 */

// Helper to format numbers with commas
const fmt = (n) => Number(n).toLocaleString('en-US')

/**
 * BASE_PROMPT - Expert social media strategist identity
 * Covers platform algorithms, content frameworks, hashtag strategy, monetization, optimization
 */
const BASE_PROMPT = `You are a social media content strategist with deep expertise across Instagram, Facebook, and TikTok algorithms.

You understand:
- Hook formulas that stop the scroll (pattern interrupts, curiosity gaps, shocking openings)
- Algorithm mechanics: Instagram favors saves/shares/watch time, Facebook prioritizes comments/shares, TikTok rewards completion rate
- Content frameworks: Problem-solution, storytelling arcs, behind-the-scenes, educational sequences
- Hashtag strategy: Mix of reach (#100k-500k), niche (#10k-100k), and micro tags (#1k-10k)
- Monetization frameworks: Affiliate links, digital products, sponsorships, communities, paid content
- Posting optimization: Best times by platform/audience, format rotation, series structure, content pillars

Be specific and actionable.`

/**
 * ACCOUNTS - 6 social media accounts with context
 * Each has: name, handle, and account-specific prompt
 */
const ACCOUNTS = {
  'folded-steel': {
    name: 'Folded Steel',
    handle: '@foldedsteelkitchen',
    prompt: `ACCOUNT: Folded Steel (@foldedsteelkitchen)
NICHE: Premium kitchen knives, artisanal craftsmanship, culinary storytelling
PLATFORMS: Instagram primary, Facebook secondary
CURRENT STATUS: 30k followers, growing community of food enthusiasts and home cooks
GOAL: Reach 100k followers (URGENT priority)
TARGET AUDIENCE: Home cooks 25-50, food enthusiasts, culinary influencers, premium kitchen buyers
CONTENT PILLARS:
1. Knife specs & craftsmanship (edge glint, geometry, steel composition videos)
2. Chef collaborations (features with working chefs using the knives)
3. Cooking tips (knife techniques, proper maintenance, sharpening)
4. Customer stories (chef testimonials, kitchen tours, meal prep with the knife)
5. Behind-the-scenes (forge videos, design process, maker story)

MONETIZATION: Premium product sales ($200-800), affiliate kitchen links, masterclasses
NOTES: Position as the luxury knife brand. Urgency signals matter. Show why this knife is different from commodity options.`
  },

  'cook-travel-dad': {
    name: 'Cook Travel Dad',
    handle: '@cooktraveldad',
    prompt: `ACCOUNT: Cook Travel Dad (@cooktraveldad)
NICHE: Cooking on Weber Slate/griddle, dad life adventures, family travel experiences
PLATFORMS: Instagram and Facebook co-equal
CURRENT STATUS: Building audience, early monetization attempts
GOAL: $5k/month revenue in 60 days
TARGET AUDIENCE: Fathers 30-50, home cooking enthusiasts, camping/travel families
CONTENT PILLARS:
1. Griddle cooking recipes (breakfast, lunch, dinner, entertaining)
2. Dad humor & parenting moments (cooking mishaps, kid taste tests, family chaos)
3. Travel food adventures (street food, local cuisines, cooking in new places)
4. Gear reviews (Weber products, camping equipment, kitchen tools)
5. Quick weeknight meals (30-min dinners, meal prep shortcuts for busy dads)

MONETIZATION: Amazon affiliate (cookware), sponsorships (Weber, camping brands), digital product (griddle cookbook)
NOTES: Authenticity resonates here. Show real family moments. Combine food + lifestyle aspirations.`
  },

  'from-points-to-travel': {
    name: 'From Points to Travel',
    handle: '@frompointstotravel',
    prompt: `ACCOUNT: From Points to Travel (@frompointstotravel)
NICHE: Credit card points hacking, luxury travel on a budget, points redemption strategy
PLATFORMS: Facebook primary (audience naturally skews older)
CURRENT STATUS: Niche but engaged audience, premium membership potential
GOAL: Build community, establish premium membership/coaching revenue
TARGET AUDIENCE: Travelers 35-65, points enthusiasts, value-conscious luxury seekers, career professionals
CONTENT PILLARS:
1. Points redemption wins (specific examples: "$8k flight for 80k points")
2. Credit card strategy (which cards, sign-up bonuses, category spending)
3. Travel itineraries (where points got them, cost breakdown)
4. Tips & tricks (transfer partners, award availability, search hacks)
5. Luxury travel on points (5-star hotels, business class seats)

MONETIZATION: Premium membership ($9/month = strategy guides), affiliate cards, coaching calls
NOTES: Data-driven and specific. Share exact numbers. Appeal to smart travelers, not cheapskates.`
  },

  'furniture-flip': {
    name: 'Furniture Flip',
    handle: '@furnitureflip',
    prompt: `ACCOUNT: Furniture Flip (@furnitureflip)
NICHE: Free marketplace furniture, restoration/upcycling, selling for $500-700 profit per piece
PLATFORMS: Instagram and Facebook
CURRENT STATUS: Profitable side hustle, growing systematic audience
GOAL: $5k/month revenue within 90 days
TARGET AUDIENCE: Side-hustle seekers, interior designers, DIY enthusiasts, resellers
CONTENT PILLARS:
1. Before/after transformations (dramatic reveals, restoration process)
2. Finding gold (marketplace hunting, scouting strategies, recognizing value)
3. Restoration process (refinishing, repairs, time investment, tools needed)
4. Business breakdowns (profit per piece, time spent, market analysis)
5. Customer success stories (where the furniture ended up, buyer reactions)

MONETIZATION: Direct furniture sales, marketplace listings, e-course on flipping process, tools affiliate
NOTES: The money shot is transformation. Show time-lapse + dramatic reveals. Build authority on "how to find good pieces."
`
  },

  'propagate-iq': {
    name: 'Propagate IQ',
    handle: '@propagateiq',
    prompt: `ACCOUNT: Propagate IQ (@propagateiq)
NICHE: AI-powered gardening app, plant identification, seasonal care guides, propagation techniques
PLATFORMS: Instagram, TikTok, Pinterest
CURRENT STATUS: App launched, driving download awareness
GOAL: Increase app downloads, build engaged gardening community
TARGET AUDIENCE: Plant parents 20-45, indoor gardeners, sustainability-focused, tech-comfortable gardeners
CONTENT PILLARS:
1. Plant features (identification tips, care requirements, seasonal updates)
2. Propagation tutorials (step-by-step guides, success rates, tool recommendations)
3. User success stories (before/after plant growth, community moments)
4. App feature deep-dives (demonstrating AI ID capability, care reminders, seasonal tips)
5. Seasonal gardening (what to plant now, preparing for weather, seasonal pests)

MONETIZATION: App downloads (freemium model), premium features subscription
NOTES: Visually stunning content. Short-form for TikTok, carousel for IG, pins for Pinterest. Show the app in action.`
  },

  'reconnect-deck': {
    name: 'Reconnect Deck',
    handle: '@reconnectdeck',
    prompt: `ACCOUNT: Reconnect Deck (@reconnectdeck)
NICHE: Conversation starter card deck for meaningful connections, pre-launch phase
PLATFORMS: Instagram primary, TikTok secondary
CURRENT STATUS: Pre-launch, building anticipation and waitlist
GOAL: Launch with engaged audience, 1000+ pre-orders
TARGET AUDIENCE: Gift buyers 25-50, relationship-focused people, teams/corporate, date night enthusiasts
CONTENT PILLARS:
1. Problem identification (shallow conversations, screen time, connection struggles)
2. Solution tease (sneak peek cards, how the deck works, sample questions)
3. Use cases (date nights, family gatherings, team building, travel companions)
4. Anticipation building (countdown, limited edition variants, early access)
5. Authority (testimonials from beta users, research on conversation quality, brand story)

MONETIZATION: Direct product sales, corporate bulk orders, affiliate partnerships
NOTES: Mystery and anticipation drive engagement. Tease content, create FOMO. Build email list before launch.`
  },
}

/**
 * MODE_PROMPTS - 5 workflow modes that guide response format
 */
const MODE_PROMPTS = {
  chat: `MODE: Open Chat
Answer questions using the account context and performance data. Be specific, reference actual post titles and metrics when relevant.`,

  analyze: `MODE: Performance Analysis
Analyze content performance using the data provided. Cite specific post titles and numbers. Identify patterns in what resonates.
End your response with 3 concrete action items.`,

  calendar: `MODE: Weekly Content Calendar
Create a 7-day content plan. For each day include:
- Format (reel, carousel, post, story)
- Topic (from content pillars)
- Hook (opening line that stops the scroll)
- Caption outline (structure, not full copy)
- Posting time (best for this account)
- Content pillar

Structure as a simple day-by-day breakdown.`,

  caption: `MODE: Caption & Script Writer
Write a complete, ready-to-post caption with these elements:
- Hook (opening line, 3-5 words max)
- Body (main message, value, story)
- CTA (call to action)
- Hashtags (mix of reach, niche, micro tags)
- Format notes (where to break lines, emoji placement)

Provide as a complete, ready-to-paste caption.`,

  monetize: `MODE: Monetization Review
Review 3-5 specific revenue opportunities based on the account. For each:
- What it is (e.g., sponsorship with X brand)
- How it works (execution steps)
- Expected outcome ($ or audience impact)
- Timeline (how soon could this happen)

Be specific. Avoid generic "sell more" advice.`,
}

/**
 * buildContentPrompt - Assembles 4-layer prompt
 * Layer 1: Base (shared expert knowledge)
 * Layer 2: Account (account-specific context)
 * Layer 3: Mode (workflow instructions)
 * Layer 4: Performance (auto-injected from stats + posts)
 */
function buildContentPrompt(account, mode, stats, recentPosts = [], suggestionStats = null) {
  const accountData = ACCOUNTS[account]
  if (!accountData) {
    throw new Error(`Unknown account: ${account}`)
  }

  const modePrompt = MODE_PROMPTS[mode]
  if (!modePrompt) {
    throw new Error(`Unknown mode: ${mode}`)
  }

  // Start building the prompt
  let prompt = BASE_PROMPT
  prompt += '\n\n---\n\n'

  // Layer 2: Account context
  prompt += accountData.prompt
  prompt += '\n\n---\n\n'

  // Layer 3: Mode instructions
  prompt += modePrompt
  prompt += '\n\n---\n\n'

  // Layer 4: Performance data (only if there are posts)
  if (stats.totalPosts > 0) {
    prompt += buildPerformanceLayer(stats, recentPosts, suggestionStats)
  }

  return prompt
}

/**
 * buildPerformanceLayer - Formats performance data from SQLite
 */
function buildPerformanceLayer(stats, recentPosts = [], suggestionStats = null) {
  let layer = '--- YOUR RECENT PERFORMANCE ---\n\n'

  // Recent posts (newest first)
  if (recentPosts.length > 0) {
    layer += 'RECENT POSTS (newest first):\n'
    for (const post of recentPosts) {
      const parts = [
        `- ${post.post_type.charAt(0).toUpperCase() + post.post_type.slice(1)} "${post.title}"`,
        `(${post.posted_date}, ${post.platform})`,
        `${fmt(post.views)} views`,
      ]

      if (post.likes && post.likes > 0) parts.push(`${fmt(post.likes)} likes`)
      if (post.saves && post.saves > 0) parts.push(`${fmt(post.saves)} saves`)
      if (post.shares && post.shares > 0) parts.push(`${fmt(post.shares)} shares`)
      if (post.comments && post.comments > 0) parts.push(`${fmt(post.comments)} comments`)

      layer += parts.join(', ') + '\n'
    }
    layer += '\n'
  }

  // Top performers by views
  if (stats.topPosts && stats.topPosts.length > 0) {
    layer += 'TOP PERFORMERS (by views):\n'
    for (let i = 0; i < stats.topPosts.length; i++) {
      const post = stats.topPosts[i]
      const parts = [
        `${i + 1}. "${post.title}" (${post.post_type}, ${post.posted_date})`,
        `${fmt(post.views)} views`,
      ]

      if (post.saves && post.saves > 0) parts.push(`${fmt(post.saves)} saves`)
      if (post.shares && post.shares > 0) parts.push(`${fmt(post.shares)} shares`)

      layer += parts.join(', ') + '\n'
    }
    layer += '\n'
  }

  // Overall stats
  layer += `OVERALL: ${stats.totalPosts} posts, avg ${fmt(stats.avgViews)} views\n`

  // By format
  if (stats.byType && Object.keys(stats.byType).length > 0) {
    const formatStats = Object.entries(stats.byType)
      .map(([type, data]) => `${type} (${data.count} posts, avg ${fmt(data.avgViews)} views)`)
      .join(' | ')
    layer += `BY FORMAT: ${formatStats}\n`
  }

  // Suggestion hit rate (if available)
  if (suggestionStats && suggestionStats.suggestionsTotal > 0) {
    layer += `\nSUGGESTION HIT RATE: ${suggestionStats.suggestionsPosted} / ${suggestionStats.suggestionsTotal} suggestions posted`
    if (suggestionStats.avgPostedViews > 0) {
      layer += `, avg ${fmt(suggestionStats.avgPostedViews)} views on posted suggestions`
    }
    layer += '\n'
  }

  return layer
}

export { buildContentPrompt, ACCOUNTS, BASE_PROMPT, MODE_PROMPTS }
