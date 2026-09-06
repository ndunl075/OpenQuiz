<h1 align="center">OpenQuiz</h1>

<p align="center">
  An open-source, local-first study app with every study mode.<br />
  No accounts. No cloud. No tracking. Your sets never leave your device.
</p>

---

## Why

Flashcard apps have grown accounts, paywalls, social feeds and ads around what
should be a simple loop: see a term, recall it, repeat what you missed.
OpenQuiz keeps the loop and drops the rest.

## Study modes

| Mode | What it does |
|---|---|
| **Flashcards** | 3D flip cards with swipe, shuffle, autoplay and Know / Still-learning sorting. |
| **Learn** | Adaptive rounds that move you from multiple choice to written recall as terms stick. |
| **Write** | Typed recall with smart grading and an "I was right" override. |
| **Spell** | Listen and type. Character-level feedback on every miss. |
| **Test** | Generated exams: written, multiple choice, true/false and matching. |
| **Match** | Race the clock pairing terms with definitions. |
| **Gravity** | Type the answer before the term hits the ground. |

## Everything is local

Data lives in your browser's IndexedDB. There is no server, no API key and no
sign-in. Export any set — or your whole library — to JSON or CSV at any time,
and import it on another device.

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
```

```bash
npm run build    # type-check + production bundle
npm test         # unit tests
npm run lint     # oxlint
```

The production build is a static site: drop `dist/` on any static host, or
install it as a PWA and use it offline.

## Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) — data model, module layout, mode design,
  the grading engine and the scheduler.

## Non-goals

Accounts, cloud sync, sharing links, classes, comments, ads and telemetry are
all out of scope. If a feature needs a backend, it does not belong here.

## Prior art and independence

OpenQuiz is an independent project inspired by the study-mode format popularised
by tools like Quizlet. It shares no code, assets or branding with any of them,
and is not affiliated with or endorsed by any such company.

## License

[MIT](./LICENSE)
