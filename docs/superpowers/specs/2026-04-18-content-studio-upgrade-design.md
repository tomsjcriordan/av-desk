# Content Studio Upgrade — Design Spec

**Goal:** Transform the Content Studio from a simple chat into a full social media content engine. Each of the 6 accounts becomes an isolated, data-driven AI strategist that learns from post performance and produces actionable content that drives growth and revenue.

**Core Principle:** Complete account isolation. Each account has its own data, context, suggestions, and performance history. Folded Steel never sees Cook Travel Dad's data.

---

## Data Model

### `content_posts` table

Tracks every post logged by the user with its performance metrics.

```sql
CREATE TABLE IF NOT EXISTS content_posts (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  account        TEXT    NOT NULL,
  platform       TEXT    NOT NULL CHECK(platform IN ('instagram','facebook','tiktok')),
  post_type      TEXT    NOT NULL CHECK(post_type IN ('reel','post','story','carousel')),
  title          TEXT    NOT NULL DEFAULT '',
  caption        TEXT    DEFAULT '',
  posted_date    TEXT    NOT NULL,
  views          INTEGER NOT NULL DEFAULT 0,
  likes          INTEGER NOT NULL DEFAULT 0,
  saves          INTEGER NOT NULL DEFAULT 0,
  shares         INTEGER NOT NULL DEFAULT 0,
  comments       INTEGER NOT NULL DEFAULT 0,
  watch_time_sec REAL    DEFAULT 0,
  revenue        REAL    DEFAULT 0,
  suggestion_id  INTEGER DEFAULT NULL REFERENCES content_suggestions(id),
  notes          TEXT    DEFAULT '',
  created_at     TEXT    DEFAULT (datetime('now'))
);
```

### `content_suggestions` table

Tracks every suggestion the agent makes, enabling the feedback loop.

```sql
CREATE TABLE IF NOT EXISTS content_suggestions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  account    TEXT    NOT NULL,
  workflow   TEXT    NOT NULL CHECK(workflow IN ('calendar','caption','analyze','monetize','chat')),
  content    TEXT    NOT NULL,
  status     TEXT    NOT NULL DEFAULT 'suggested' CHECK(status IN ('suggested','posted','skipped')),
  created_at TEXT    DEFAULT (datetime('now'))
);
```

### Relationships

- `content_posts.suggestion_id` → `content_suggestions.id` (nullable FK)
- When a post is linked to a suggestion, that suggestion's status becomes `'posted'`
- All queries are scoped by `account` column — no cross-account data access

---

## Workflows (5 Modes)

Each account's Content Studio screen has a mode selector at the top. All modes share the same chat interface but differ in system prompt and behavior.

### 1. Chat (default)
Open conversation with performance context injected. Same as current behavior but with the account's recent post data in the system prompt so responses are grounded in real performance.

### 2. Analyze
Agent reviews the account's logged posts, identifies patterns, and provides actionable takeaways:
- What content types perform best (reels vs posts vs carousels)
- Which topics/hooks drive the most saves and shares
- Engagement rate trends
- Specific recommendations: "Your knife close-up reels avg 45k views vs 8k for tip posts — do more close-ups"

### 3. Calendar
Generates a 7-day content plan with:
- Specific post ideas per day
- Recommended format (reel, carousel, story)
- Hook and caption outline
- Optimal posting time
- Which content pillar it serves
Based on what's been performing well for the account.

### 4. Caption
User provides a topic or concept → agent returns a ready-to-post caption or reel script:
- Strong hook (first line)
- Body with value
- Call-to-action
- Hashtag suggestions
- Format-specific notes (e.g. "for reel: show the sizzle in first 0.5s")

### 5. Monetize
Reviews the account's metrics and current state, then suggests specific revenue actions:
- Brand deal outreach (who to pitch, what to say, rate suggestions)
- Affiliate opportunities relevant to the niche
- Digital product ideas based on audience engagement patterns
- Platform monetization eligibility and optimization
- Sponsored content formats that match the account's strengths

---

## System Prompt Architecture

Prompts are built dynamically at call time from 4 layers:

### Layer 1: Base (shared across all accounts)
Expert social media strategist identity covering:
- Instagram/FB/TikTok algorithm knowledge (Reels boost, watch time signals, saves > likes)
- Hook formula frameworks (curiosity gap, pattern interrupt, bold claim, "stop the scroll")
- CTA best practices (comment prompts, save triggers, share drivers)
- Hashtag strategy principles
- Posting time optimization
- Revenue frameworks (brand deals, affiliate, digital products, platform monetization)
- Content pillar methodology
- Engagement rate benchmarks by niche

### Layer 2: Account (unique per account)
Account-specific context including:
- Brand name, handle, niche
- Current follower count and growth goals
- Target audience demographics
- Revenue goals and timeline
- Content pillars specific to this account
- Platform focus (IG, FB, TikTok, or combo)
- Competitive landscape notes
- Urgency level (e.g. Folded Steel is URGENT)

### Layer 3: Mode (unique per workflow)
Instructions specific to the active mode:
- Analyze: "Focus on patterns in the data. Be specific — cite post titles and numbers. End with 3 actionable changes."
- Calendar: "Generate a 7-day plan. Each day has: format, topic, hook, caption outline, posting time, content pillar."
- Caption: "Write a complete, ready-to-post caption. Include hook, body, CTA, and hashtags."
- Monetize: "Review metrics and suggest 3-5 specific revenue actions with expected outcomes."
- Chat: "Answer the user's question using their performance data as context."

### Layer 4: Performance (auto-injected from SQLite)
Built dynamically from the account's `content_posts` and `content_suggestions` data:
```
YOUR RECENT PERFORMANCE (last 20 posts):
- Reel "Weber Slate Smashburger" (Apr 12, IG): 45k views, 2.1k saves, 890 shares
- Post "Knife maintenance tips" (Apr 10, IG): 8k views, 340 saves, 12 shares
...

TOP 5 PERFORMERS (by views):
1. ...

ENGAGEMENT RATE: avg X% across last 20 posts
BEST PERFORMING FORMAT: Reels (avg Xk views) vs Posts (avg Xk views)
SUGGESTION HIT RATE: 6/10 suggestions posted, avg 23k views
```

If no posts are logged yet, this layer is omitted and the agent works from the account context alone.

---

## Log Post Form

A "Log Post" button in the screen header opens an inline form:

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Platform | dropdown | yes | instagram, facebook, tiktok |
| Post Type | dropdown | yes | reel, post, story, carousel |
| Title | text | yes | Brief description of the post |
| Caption | textarea | no | The actual caption used |
| Posted Date | date | yes | Defaults to today |
| Views | number | yes | |
| Likes | number | yes | |
| Saves | number | yes | |
| Shares | number | yes | |
| Comments | number | yes | |
| Watch Time (avg sec) | number | no | Primarily for Reels |
| Revenue ($) | number | no | Sponsored/affiliate/direct sales |
| Linked Suggestion | dropdown | no | Recent suggestions for this account, or "None" |
| Notes | textarea | no | Why it performed well/poorly |

When a suggestion is linked, its status updates to `'posted'`.

---

## UI Layout

The Content Studio screen for each account:

```
┌─────────────────────────────────────────────┐
│ [Account Title]           [Log Post] button  │
│ subtitle                                     │
├─────────────────────────────────────────────┤
│ [Chat] [Analyze] [Calendar] [Caption] [$$]  │  ← mode selector tabs
├─────────────────────────────────────────────┤
│                                             │
│  Chat/response area                         │
│  (messages with performance context)        │
│                                             │
├─────────────────────────────────────────────┤
│ [input] [Send]                              │
└─────────────────────────────────────────────┘
```

When "Log Post" is clicked, the form appears inline above the chat area (same pattern as invoice/expense forms). After saving, it returns to the chat view.

Mode selector tabs switch the active workflow. Switching modes does NOT clear chat history — each mode maintains its own message history in component state.

---

## Account Isolation Enforcement

- All SQLite queries include `WHERE account = ?` — never query without account scope
- Each account's system prompt is built independently from its own data
- Chat history is kept in component state per account (resets on account switch, as currently implemented)
- Suggestions are scoped by account — the "Linked Suggestion" dropdown only shows suggestions for the current account
- No shared state between accounts in any layer

---

## File Map (estimated)

| File | Action |
|------|--------|
| `src/main/db.js` | Modify — add content_posts + content_suggestions tables and CRUD |
| `src/main/index.js` | Modify — add IPC handlers for posts/suggestions |
| `src/main/contentPrompts.js` | Create — prompt builder (base + account + mode + performance layers) |
| `src/preload/index.js` | Modify — expose posts/suggestions API |
| `src/renderer/src/screens/ContentStudio.jsx` | Replace — full upgrade with modes, log post, performance context |
| `src/renderer/src/screens/content/ModeSelector.jsx` | Create — tab bar for 5 modes |
| `src/renderer/src/screens/content/LogPostForm.jsx` | Create — post logging form |
| `tests/main/db.content.test.js` | Create — DB CRUD tests |
| `tests/main/contentPrompts.test.js` | Create — prompt builder tests |
| `tests/renderer/ContentStudio.test.jsx` | Replace — full test coverage |
| `tests/renderer/LogPostForm.test.jsx` | Create — form tests |
| `tests/renderer/ModeSelector.test.jsx` | Create — mode selector tests |
