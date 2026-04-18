// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { buildContentPrompt, ACCOUNTS, BASE_PROMPT, MODE_PROMPTS } from '../../src/main/contentPrompts'

describe('contentPrompts', () => {
  it('exports all 6 accounts', () => {
    expect(Object.keys(ACCOUNTS)).toHaveLength(6)
    expect(ACCOUNTS['folded-steel']).toBeDefined()
    expect(ACCOUNTS['cook-travel-dad']).toBeDefined()
    expect(ACCOUNTS['from-points-to-travel']).toBeDefined()
    expect(ACCOUNTS['furniture-flip']).toBeDefined()
    expect(ACCOUNTS['propagate-iq']).toBeDefined()
    expect(ACCOUNTS['reconnect-deck']).toBeDefined()
  })

  it('exports all 5 mode prompts', () => {
    expect(MODE_PROMPTS.chat).toBeDefined()
    expect(MODE_PROMPTS.analyze).toBeDefined()
    expect(MODE_PROMPTS.calendar).toBeDefined()
    expect(MODE_PROMPTS.caption).toBeDefined()
    expect(MODE_PROMPTS.monetize).toBeDefined()
  })

  it('builds prompt with all 4 layers for account with posts', () => {
    const stats = {
      totalPosts: 5,
      avgViews: 20000,
      topPosts: [
        { title: 'Edge glint', post_type: 'reel', posted_date: '2026-04-17', platform: 'instagram', views: 45000, saves: 2100, shares: 890 },
      ],
      byType: { reel: { count: 3, avgViews: 30000 }, post: { count: 2, avgViews: 5000 } },
    }
    const recentPosts = [
      { title: 'Edge glint', post_type: 'reel', posted_date: '2026-04-17', platform: 'instagram', views: 45000, likes: 3200, saves: 2100, shares: 890, comments: 340 },
    ]
    const result = buildContentPrompt('folded-steel', 'analyze', stats, recentPosts, { suggestionsPosted: 3, suggestionsTotal: 5, avgPostedViews: 25000 })

    expect(result).toContain(BASE_PROMPT)
    expect(result).toContain('Folded Steel')
    expect(result).toContain(MODE_PROMPTS.analyze)
    expect(result).toContain('Edge glint')
    expect(result).toContain('45,000 views')
  })

  it('omits performance layer when no posts', () => {
    const stats = { totalPosts: 0, avgViews: 0, topPosts: [], byType: {} }
    const result = buildContentPrompt('folded-steel', 'chat', stats, [], null)

    expect(result).toContain(BASE_PROMPT)
    expect(result).toContain('Folded Steel')
    expect(result).not.toContain('YOUR RECENT PERFORMANCE')
  })

  it('includes suggestion hit rate when available', () => {
    const stats = { totalPosts: 1, avgViews: 10000, topPosts: [], byType: {} }
    const result = buildContentPrompt('folded-steel', 'chat', stats, [], { suggestionsPosted: 3, suggestionsTotal: 5, avgPostedViews: 20000 })

    expect(result).toContain('SUGGESTION HIT RATE')
    expect(result).toContain('3 / 5')
  })

  it('formats numbers with commas', () => {
    const stats = { totalPosts: 1, avgViews: 45000, topPosts: [], byType: {} }
    const recentPosts = [
      { title: 'Big post', post_type: 'reel', posted_date: '2026-04-17', platform: 'instagram', views: 123456, likes: 0, saves: 0, shares: 0, comments: 0 },
    ]
    const result = buildContentPrompt('folded-steel', 'chat', stats, recentPosts, null)
    expect(result).toContain('123,456')
  })
})
