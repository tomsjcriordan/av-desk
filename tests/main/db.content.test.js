// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import {
  initDb,
  addSuggestion, listSuggestions, updateSuggestionStatus,
  addPost, listPosts, deletePost, getPostStats,
} from '../../src/main/db'

let db

beforeEach(() => {
  db = new Database(':memory:')
  initDb(db)
})

describe('content_suggestions', () => {
  it('adds a suggestion scoped to an account', () => {
    const s = addSuggestion(db, { account: 'folded-steel', workflow: 'calendar', content: 'Post a reel showing knife edge glinting' })
    expect(s.id).toBeDefined()
    expect(s.account).toBe('folded-steel')
    expect(s.workflow).toBe('calendar')
    expect(s.status).toBe('suggested')
  })

  it('lists suggestions for one account only', () => {
    addSuggestion(db, { account: 'folded-steel', workflow: 'chat', content: 'Idea A' })
    addSuggestion(db, { account: 'cook-travel-dad', workflow: 'chat', content: 'Idea B' })
    const list = listSuggestions(db, 'folded-steel')
    expect(list).toHaveLength(1)
    expect(list[0].content).toBe('Idea A')
  })

  it('lists suggestions newest first', () => {
    addSuggestion(db, { account: 'folded-steel', workflow: 'chat', content: 'First' })
    addSuggestion(db, { account: 'folded-steel', workflow: 'chat', content: 'Second' })
    const list = listSuggestions(db, 'folded-steel')
    expect(list[0].content).toBe('Second')
  })

  it('updates suggestion status to posted', () => {
    const s = addSuggestion(db, { account: 'folded-steel', workflow: 'caption', content: 'Hook idea' })
    const updated = updateSuggestionStatus(db, s.id, 'posted')
    expect(updated.status).toBe('posted')
  })

  it('filters suggestions by status', () => {
    addSuggestion(db, { account: 'folded-steel', workflow: 'chat', content: 'A' })
    const s2 = addSuggestion(db, { account: 'folded-steel', workflow: 'chat', content: 'B' })
    updateSuggestionStatus(db, s2.id, 'posted')
    const suggested = listSuggestions(db, 'folded-steel', 'suggested')
    expect(suggested).toHaveLength(1)
    expect(suggested[0].content).toBe('A')
  })
})

describe('content_posts', () => {
  it('adds a post with metrics', () => {
    const p = addPost(db, {
      account: 'folded-steel', platform: 'instagram', post_type: 'reel',
      title: 'Knife edge glint', caption: 'Look at this edge', posted_date: '2026-04-17',
      views: 45000, likes: 3200, saves: 2100, shares: 890, comments: 340,
      watch_time_sec: 12.5, revenue: 0, suggestion_id: null, notes: 'Went viral',
    })
    expect(p.id).toBeDefined()
    expect(p.account).toBe('folded-steel')
    expect(p.views).toBe(45000)
  })

  it('lists posts for one account only, newest first', () => {
    addPost(db, {
      account: 'folded-steel', platform: 'instagram', post_type: 'reel',
      title: 'Old post', caption: '', posted_date: '2026-04-10',
      views: 1000, likes: 100, saves: 50, shares: 10, comments: 5,
    })
    addPost(db, {
      account: 'folded-steel', platform: 'instagram', post_type: 'post',
      title: 'New post', caption: '', posted_date: '2026-04-17',
      views: 5000, likes: 500, saves: 200, shares: 80, comments: 40,
    })
    addPost(db, {
      account: 'cook-travel-dad', platform: 'facebook', post_type: 'reel',
      title: 'Other account', caption: '', posted_date: '2026-04-17',
      views: 9999, likes: 0, saves: 0, shares: 0, comments: 0,
    })
    const list = listPosts(db, 'folded-steel')
    expect(list).toHaveLength(2)
    expect(list[0].title).toBe('New post')
  })

  it('links a post to a suggestion', () => {
    const s = addSuggestion(db, { account: 'folded-steel', workflow: 'caption', content: 'Edge glint reel' })
    const p = addPost(db, {
      account: 'folded-steel', platform: 'instagram', post_type: 'reel',
      title: 'Edge glint', caption: '', posted_date: '2026-04-17',
      views: 45000, likes: 3200, saves: 2100, shares: 890, comments: 340,
      suggestion_id: s.id,
    })
    expect(p.suggestion_id).toBe(s.id)
    const updated = listSuggestions(db, 'folded-steel', 'posted')
    expect(updated).toHaveLength(1)
  })

  it('deletes a post', () => {
    const p = addPost(db, {
      account: 'folded-steel', platform: 'instagram', post_type: 'reel',
      title: 'Delete me', caption: '', posted_date: '2026-04-17',
      views: 100, likes: 10, saves: 5, shares: 1, comments: 0,
    })
    deletePost(db, p.id)
    expect(listPosts(db, 'folded-steel')).toHaveLength(0)
  })

  it('computes post stats for an account', () => {
    addPost(db, {
      account: 'folded-steel', platform: 'instagram', post_type: 'reel',
      title: 'Reel 1', caption: '', posted_date: '2026-04-17',
      views: 40000, likes: 3000, saves: 2000, shares: 800, comments: 300,
    })
    addPost(db, {
      account: 'folded-steel', platform: 'instagram', post_type: 'post',
      title: 'Post 1', caption: '', posted_date: '2026-04-16',
      views: 8000, likes: 500, saves: 200, shares: 50, comments: 30,
    })
    const stats = getPostStats(db, 'folded-steel')
    expect(stats.totalPosts).toBe(2)
    expect(stats.avgViews).toBe(24000)
    expect(stats.topPosts).toHaveLength(2)
    expect(stats.topPosts[0].title).toBe('Reel 1')
    expect(stats.byType.reel.avgViews).toBe(40000)
    expect(stats.byType.post.avgViews).toBe(8000)
  })

  it('returns empty stats for account with no posts', () => {
    const stats = getPostStats(db, 'folded-steel')
    expect(stats.totalPosts).toBe(0)
    expect(stats.avgViews).toBe(0)
    expect(stats.topPosts).toHaveLength(0)
    expect(stats.byType).toEqual({})
  })
})
