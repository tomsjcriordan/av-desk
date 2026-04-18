# Plan 5: File Distribution Implementation Plan

**Goal:** Build the File Distribution screen — an interactive step-by-step guide for pushing presentation files to 15-20 Windows conference room PCs via SMB network shares, with room-by-room delivery tracking and reusable venue templates.

**Architecture:** Venues and rooms stored in SQLite (following the established pattern). The guide is a collapsible accordion of setup steps with practical instructions. Room tracker lets you add rooms (name + IP), mark each as delivered, and save/load venue templates for reuse across gigs. No actual SMB connection — this is a reference guide with tracking.

**Tech Stack:** better-sqlite3, Electron IPC, React 18, Vitest

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/main/db.js` | Modify | Add `venues` and `rooms` tables + CRUD |
| `src/main/index.js` | Modify | Add venue/room IPC handlers |
| `src/preload/index.js` | Modify | Expose `electronAPI.venues` and `electronAPI.rooms` |
| `src/renderer/src/screens/FileDistribution.jsx` | Replace | Full guide + room tracker UI |
| `src/renderer/src/screens/filedist/GuideSteps.jsx` | Create | Collapsible step-by-step guide accordion |
| `src/renderer/src/screens/filedist/RoomTracker.jsx` | Create | Room list with delivery status tracking |
| `tests/main/db.filedist.test.js` | Create | DB CRUD tests for venues/rooms |
| `tests/renderer/FileDistribution.test.jsx` | Create | Screen integration tests |
| `tests/renderer/GuideSteps.test.jsx` | Create | Guide component tests |
| `tests/renderer/RoomTracker.test.jsx` | Create | Room tracker tests |
| `tests/renderer/App.test.jsx` | Modify | Add venue/room mocks |

---

## Data Shapes

**Venue (SQLite):**
```
id, name, notes, created_at
```

**Room (SQLite):**
```
id, venue_id, name, ip_address, share_path, status ('pending'|'delivered'), created_at
```

---

## Guide Steps Content

1. **Connect to Venue Network** — Plug Mac into venue switch/router. System Preferences > Network > confirm IP. Ping a room PC to verify.
2. **Enable Sharing on Windows PCs** — On each Lenovo: Settings > Network & Sharing > Turn on network discovery + file sharing. Create a folder (e.g. `C:\Presentations`) and right-click > Share.
3. **Connect from Mac** — Finder > Go > Connect to Server > `smb://[room IP]/Presentations`. Enter credentials if prompted.
4. **Copy Files** — Drag PowerPoint/Keynote files to each room's mounted share. Verify file size matches.
5. **Verify & Mark Delivered** — Open the file on the room PC to confirm. Mark the room as delivered in the tracker below.

---

## Task 1: DB layer — venues + rooms tables and CRUD (TDD)

**Files:**
- Modify: `src/main/db.js`
- Create: `tests/main/db.filedist.test.js`

- [ ] **Step 1: Write failing DB tests**
- [ ] **Step 2: Run to confirm fail**
- [ ] **Step 3: Add venues/rooms tables to migration in db.js**
- [ ] **Step 4: Add CRUD functions**
- [ ] **Step 5: Run tests and confirm pass**
- [ ] **Step 6: Run full suite**
- [ ] **Step 7: Commit**

---

## Task 2: IPC handlers + preload bridge

**Files:**
- Modify: `src/main/index.js`
- Modify: `src/preload/index.js`

- [ ] **Step 1: Add venue/room IPC handlers to index.js**
- [ ] **Step 2: Add venue/room bridge to preload**
- [ ] **Step 3: Run full suite**
- [ ] **Step 4: Commit**

---

## Task 3: GuideSteps component (TDD)

**Files:**
- Create: `src/renderer/src/screens/filedist/GuideSteps.jsx`
- Create: `tests/renderer/GuideSteps.test.jsx`

- [ ] **Step 1: Write failing tests**
- [ ] **Step 2: Create GuideSteps component**
- [ ] **Step 3: Run tests and confirm pass**
- [ ] **Step 4: Commit**

---

## Task 4: RoomTracker component (TDD)

**Files:**
- Create: `src/renderer/src/screens/filedist/RoomTracker.jsx`
- Create: `tests/renderer/RoomTracker.test.jsx`

- [ ] **Step 1: Write failing tests**
- [ ] **Step 2: Create RoomTracker component**
- [ ] **Step 3: Run tests and confirm pass**
- [ ] **Step 4: Commit**

---

## Task 5: FileDistribution screen + integration

**Files:**
- Replace: `src/renderer/src/screens/FileDistribution.jsx`
- Create: `tests/renderer/FileDistribution.test.jsx`
- Modify: `tests/renderer/App.test.jsx`

- [ ] **Step 1: Write failing tests**
- [ ] **Step 2: Replace FileDistribution.jsx**
- [ ] **Step 3: Update App.test.jsx mocks**
- [ ] **Step 4: Run full suite**
- [ ] **Step 5: Commit**
