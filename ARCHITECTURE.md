# OpenQuiz — Architecture Guide

An open-source, local-first study app with a Quizlet-style UI and every study mode.
No accounts, no social features, no backend. Everything lives on the device.

---

## 1. Principles

| # | Principle | Consequence |
|---|-----------|-------------|
| 1 | **Local-first** | All data in IndexedDB. Zero network calls at runtime. App works offline from first load. |
| 2 | **No accounts** | No auth, no user table, no sync. `Set` is the root aggregate. |
| 3 | **Modes are pure** | Every study mode is a self-contained route that reads a `Set` and writes back only `StudyProgress`. Modes never mutate terms. |
| 4 | **Animation is a layer, not a feature** | Motion lives in `components/motion` + Tailwind keyframes. Removing it must never break logic. |
| 5 | **Deterministic grading** | Answer checking is one pure function (`lib/grade.ts`). Every mode calls it. Tested in isolation. |

---

## 2. Stack

| Concern | Choice | Why |
|---|---|---|
| Build | **Vite 8** + React 19 + TS | Fast HMR, first-class TS, static output deployable to any host. |
| Styling | **Tailwind v4** (`@tailwindcss/vite`) | Design tokens as CSS vars; no runtime CSS-in-JS cost. |
| Animation | **Motion** (`motion/react`) | Layout animations, spring physics, `AnimatePresence` for card transitions. |
| State (session) | **Zustand** | Study-session state is ephemeral and per-route. No boilerplate. |
| State (persistent) | **Dexie** (IndexedDB) | Structured, indexed, async, survives reloads, handles MBs of sets. |
| Routing | **React Router 7** | Nested routes map 1:1 to `/set/:id/<mode>`. |
| Test | **Vitest** + Testing Library | Same transform pipeline as the app. |
| Offline | **vite-plugin-pwa** | Precache shell → true offline. |

---

## 3. Data Model

```ts
StudySet  { id, title, description, terms: Term[], folderId?, createdAt, updatedAt, termLang, defLang }
Term      { id, term, definition, starred, imageUrl? }
Folder    { id, name, createdAt }
Progress  { setId, termId, box: 0..5, status: 'new'|'learning'|'mastered',
            seen, correct, incorrect, lastSeen }
ModeStats { setId, mode, bestMs?, bestScore?, lastPlayed }
Settings  { theme, sortMode, ttsEnabled, answerSide, keyboardShortcuts, reducedMotion }
```

**Tables (Dexie v1):** `sets`, `folders`, `progress` (compound key `[setId+termId]`), `modeStats`, `settings` (singleton row).

Progress is keyed by `(setId, termId)` so it survives set edits and is shared across Learn / Write / Spell — mastery is a property of *the term*, not of a mode.

---

## 4. Directory Layout

```
src/
├─ lib/            db.ts · types.ts · grade.ts · scheduler.ts · tts.ts
│                  parseImport.ts · exportSet.ts · shuffle.ts · format.ts
├─ store/          useSettings.ts · useSets.ts   (Zustand + Dexie live queries)
├─ hooks/          useLiveSet · useProgress · useKeyboard · useCountdown
├─ components/
│  ├─ ui/          Button · Input · Modal · Toggle · Progress · Tooltip · Menu
│  ├─ layout/      AppShell · TopNav · ModeNav · ModeHeader
│  └─ study/       FlipCard · TermRow · AnswerFeedback · RoundSummary
└─ routes/
   ├─ Home · Library · CreateSet · EditSet · SetDetail · Stats · SettingsPage
   └─ modes/       Flashcards · Learn · Write · Spell · Test · Match · Gravity
```

---

## 5. Study Modes

| Mode | Core loop | Persists |
|---|---|---|
| **Flashcards** | 3D flip card, swipe/arrow nav, shuffle, autoplay, Know / Still-learning sort. | `Progress.status` |
| **Learn** | Adaptive rounds of 7. Leitner box decides question *type*: box 0–1 → multiple choice, 2–3 → written, 4+ → mastered. Round summary between sets. | `Progress.box` |
| **Write** | Typed answer only, smart grading, "I was right" override, retype-on-miss. | `Progress` |
| **Spell** | TTS reads the term; user types what they hear. Character-level diff on error. | `Progress` |
| **Test** | Config screen → generated exam (written / MC / true-false / matching) → graded results with per-question review. | `ModeStats.bestScore` |
| **Match** | 12-tile grid, click-to-pair, live timer, personal best. Wrong pair = shake + 1s penalty. | `ModeStats.bestMs` |
| **Gravity** | Falling terms, type the definition before impact. Levels, lives, speed ramp. | `ModeStats.bestScore` |

### Scheduler (`lib/scheduler.ts`)
A Leitner-box engine shared by Learn / Write / Spell.

```
correct   → box + 1  (cap 5, box ≥ 4 ⇒ mastered)
incorrect → box = max(0, box - 2)
next()    → weighted pick: lowest box first, never the same term twice in a row
```

### Grading (`lib/grade.ts`)
One pure function, four passes:
1. exact → 2. normalized (case/punct/article/whitespace-insensitive)
3. accepts `a/b` and `a (b)` alternatives → 4. Levenshtein ≤ threshold ⇒ `'typo'`

Returns `'correct' | 'typo' | 'incorrect'` so modes can show "watch your spelling" instead of failing the user.

---

## 6. Design System

Tokens live in `src/index.css` as CSS custom properties, consumed by Tailwind v4 `@theme`.

| Token | Light | Dark |
|---|---|---|
| `--oq-indigo` | `#4255ff` | `#4255ff` |
| `--oq-bg` | `#f6f7fb` | `#0a092d` |
| `--oq-surface` | `#ffffff` | `#2e3856` |
| `--oq-text` | `#303545` | `#f6f7fb` |
| `--oq-accent` | `#ffcd1f` | `#ffcd1f` |

**Button:** raised block with a 4px darker bottom edge that collapses to 0 on `:active` — the tactile press. Defined once in `components/ui/Button.tsx`.

**Motion budget:** card flip 400ms, page transition 200ms, tile match 250ms, feedback flash 150ms. All wrapped in `useReducedMotion()`.

---

## 7. Data Flow

```
IndexedDB ──Dexie──▶ useLiveSet(setId) ──▶ Mode route
                                             │
                          session state (Zustand, per-mode, ephemeral)
                                             │
                            onAnswer() ──▶ scheduler ──▶ writeProgress()
                                                             │
                                                             ▼
                                                        IndexedDB
```

Mode routes hold **no** persistent state of their own. Refreshing mid-session restores from `Progress`.

---

## 8. Import / Export

- **Import:** paste text, choose term/def separator (tab, comma, custom) and row separator (newline, semicolon, custom); live preview table.
- **Export:** single set or full library → `.json` (round-trippable) or `.csv`.
- Backup/restore of the entire IndexedDB in Settings.

---

## 9. Testing

| Layer | What |
|---|---|
| `lib/*` | Grading, scheduler, test generator, import parser, backup, shuffle — pure-function unit tests. |
| Stores | Dexie CRUD against `fake-indexeddb`. |
| Components | Render + interaction for each mode's core loop via Testing Library. |
| `e2e/` | Playwright drives the built app: create a set, visit all seven modes, fail on any console or page error. |

Unit tests cannot see a stylesheet that does not apply or a route that mounts
twice, so the e2e journey is not optional — it is the layer that catches those.

`npm test` runs Vitest, `npm run test:e2e` runs the journey, `npm run lint`
treats warnings as errors, and `npm run build` type-checks then bundles. All
four gate every PR.

---

## 11. Route transitions

`AppShell` animates between pages with `AnimatePresence mode="wait"`, which
keeps the outgoing page mounted while it animates out. `useOutlet()` returns the
*incoming* route as soon as the URL changes, so the new page would render inside
the outgoing wrapper and then mount a second time when the key swaps — silently
discarding any state set during the transition. `FrozenOutlet` captures the
outlet at mount so the exiting subtree keeps rendering the route it belongs to.

---

## 10. Non-Goals

No accounts, no cloud sync, no sharing links, no classes, no comments, no ads, no telemetry, no server. If a feature needs a backend, it is out of scope.
