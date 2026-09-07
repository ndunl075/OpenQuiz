<h1 align="center">OpenQuiz</h1>

<p align="center">
  A free flashcards app with seven ways to study.<br />
  No sign-up, no subscription, no ads — and your notes never leave your device.
</p>

---

## What is it?

OpenQuiz is a study app. You type in a list of things you want to remember —
Spanish words, exam definitions, capital cities, anything with two sides — and
it drills you on them until they stick.

It's the same idea as Quizlet or Anki, with two differences:

- **It's completely free, forever.** No account, no paywall, no ads, no upsell.
- **Your study sets stay on your own device.** Nothing is uploaded anywhere.
  There's no company server holding your notes, because there's no server at all.

## The seven ways to study

You make a set once, then practise it in whichever mode suits you.

| Mode | What it's like |
|---|---|
| **Flashcards** | Classic cards you flip over. Sort them into "I know this" and "still learning" as you go. |
| **Learn** | The app works out what you don't know and keeps bringing it back. It starts you on multiple choice, then makes you type the answer once you've got the hang of it. |
| **Write** | Type every answer from memory. Get one wrong and it makes you write the correct answer out once before moving on. |
| **Spell** | The app reads a word aloud and you type what you hear. Handy for languages. It shows you exactly which letters you got wrong. |
| **Test** | A practice exam. Choose how many questions and what kind — typed answers, multiple choice, true/false, matching — then get a score and see what you missed. |
| **Match** | A timed game. Pair each term with its definition as fast as you can and beat your own record. |
| **Gravity** | Words fall down the screen and you type the answer before they land. Three lives, and it speeds up as you go. |

## What else it does

- **Paste in a whole list at once.** Copy a column out of a spreadsheet or a
  document and OpenQuiz will turn it into cards for you.
- **Tracks what you've learned** across every mode, so progress in Learn also
  counts in Write, and vice versa.
- **Forgives typos.** Get one letter wrong and it says "watch your spelling"
  instead of marking you down. There's also an "I was right" button for when it
  gets it wrong.
- **Reads things aloud**, in the language you pick for the set.
- **Star the hard ones** and study only those.
- **Folders** to keep subjects apart.
- **Dark mode**, and it works on a phone.
- **Works offline.** Once it's loaded, you don't need internet to study.

## About your data — please read this bit

Everything you make is saved by your browser, on the device you are using. That
is good for privacy: nobody else can see it, and we could not look at it if we
wanted to. It also means the copy on each browser is separate.

### Will my sets still be there?

| Where you open it | Sets still there? |
|---|---|
| A new tab or window, same browser | **Yes** |
| After quitting and reopening the browser | **Yes** |
| After restarting the computer or phone | **Yes** |
| With no internet connection | **Yes** — it works offline |
| A different browser on the same device (Chrome vs Safari) | **No** — each browser keeps its own copy |
| A private / incognito window | **No** — it is discarded when you close it |
| A different device | **No** |

So "same device" means *same browser* on that device. Chrome and Safari on one
laptop are two separate libraries, and on iPhone or iPad, Chrome and Safari are
separate too, because each app keeps its own storage.

To move sets between browsers or devices, use **Settings → Back up everything**
and import the file on the other one.

### Two things that can delete your sets

- **Clearing browsing data.** Clearing history and site data, or uninstalling
  the browser, removes your sets with it. There is no cloud copy to restore.
- **iPhone and iPad specifically.** Safari deletes a website's saved data after
  **seven days** without opening that site. Adding OpenQuiz to your Home Screen
  (Share, then Add to Home Screen) exempts it from this and makes it open like
  an app. Settings shows this reminder on iOS.

OpenQuiz asks your browser to protect its data from routine clean-up as soon as
you make your first set, and Settings shows whether the browser agreed. It also
reminds you to take a backup when your library has gone a week without one.

### The strongest option: keep a copy in a folder

In **Settings → Keep a copy in a folder**, pick a folder once and OpenQuiz
writes a backup file into it every time a set changes. That copy is an ordinary
file on your disk, so it survives clearing your browser entirely — and if you
choose a folder inside iCloud Drive, Google Drive or Dropbox, it reaches your
other devices as well, without OpenQuiz ever uploading anything itself.

This uses a browser feature Chrome and Edge on desktop support; Safari and
Firefox do not, and the option is hidden where it is unavailable.

## Getting it running

> **In short:** OpenQuiz is free software rather than a website you can just
> visit, so someone needs to set it up once. It takes about two minutes and
> after that it's a normal app in your browser.

**If you're comfortable with a terminal**, or have someone who is:

1. Install [Node.js](https://nodejs.org) (pick the "LTS" version).
2. Download this project — the green **Code** button above, then
   **Download ZIP** — and unzip it.
3. Open a terminal in that folder and run these two lines, one at a time:

   ```bash
   npm install
   npm run dev
   ```

4. Open **http://localhost:5173** in your browser. You'll get a page
   introducing the app with a **Try OpenQuiz** button — click it and you're in.
   Once you've made your first set, that address goes straight to your library
   instead.

To keep using it later, run `npm run dev` again and open the same address.

### Or put it online for free

**GitHub Pages** is the shortest path, and it needs no accounts or tokens beyond
this repository. Once, under **Settings → Pages → Build and deployment**, set
**Source** to **GitHub Actions**. From then on every push to `main` publishes
itself via `.github/workflows/pages.yml`, and the address appears on the
workflow run and under the repository's Environments. (Creating the Pages site
needs repository-admin rights the workflow token does not have, which is why
that one click cannot be automated; until it happens the workflow skips with a
notice instead of failing.)

You can host it yourself just as easily — it is a static site, so **Vercel**,
Netlify and Cloudflare Pages all work on their free tiers. Point Vercel at this
repository and it will build and publish it; `vercel.json` already has the
settings, including the rewrite a single-page app needs. To have pushes deploy
there automatically, add `VERCEL_TOKEN`, `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID`
as repository secrets and `.github/workflows/deploy.yml` takes over. Without
them it quietly skips rather than failing the build.

Visitors get a landing page explaining what OpenQuiz is, with a **Try OpenQuiz**
button that opens the app. Anyone who has already made a set skips the landing
page and goes straight to their library.

**Hosting it does not change where your data lives.** The host only sends the
app to your browser, the same way it sends any web page. Everything you type is
still saved by your own browser, on your own device. Vercel never receives your
sets, and neither does anyone else.

The one thing to know: browser storage is per-device and per-browser. Your sets
on your laptop are separate from your sets on your phone, even at the same web
address. Use **Settings → Back up everything** on one and import the file on the
other to move them across.

## Common questions

**Do I need an account?**
No. There isn't one to make.

**Is it really free?**
Yes, and there's no paid tier. The [licence](./LICENSE) lets anyone use, change
and share it.

**Can I share a set with a classmate?**
Yes. On a set page, choose **Share as a link**. The whole set is packed into the
link itself, so opening it gives them a copy immediately. Nothing is uploaded:
the part after the `#` is never sent to any server, not even to whoever hosts
OpenQuiz. Very large sets do not fit in a link, and the app says so and points
you at export instead.

**Will my study progress sync between my laptop and my phone?**
Not on its own, even if you host it online — your browser does the saving, not a
server. Export a backup on one device and import it on the other, share
individual sets by link, or point the folder backup at a synced folder.

**Is this Quizlet?**
No, and it isn't affiliated with them. It's an independent project inspired by
the same study-mode format, written from scratch.

---

<details>
<summary><strong>For developers</strong></summary>

### Stack

Vite + React 19 + TypeScript, Tailwind v4, Motion for animation, Zustand for
session state, Dexie (IndexedDB) for persistence, React Router 7.

### Commands

```bash
npm install
npm run dev       # dev server on http://localhost:5173

npm run build     # type-check + production bundle
npm test          # 127 unit tests (Vitest)
npm run test:e2e     # browser journeys over the built app (Playwright)
npm run test:mobile  # phone layout checks across five device profiles
npm run test:flows   # longer user flows (editing, folders, export, offline)
npm run test:pages   # the subpath build, served the way GitHub Pages serves it
npm run test:modes   # plays every study mode and checks the answers grade right
npm run test:persistence  # proves sets are stored on the device and never sent
npm run test:share        # share links round-trip between two fresh browsers
npm run lint      # oxlint, warnings are errors
```

`test:e2e` serves the production build and drives real Chromium through creating
a set and visiting every study mode, failing on any console or page error.
`test:mobile` replays that across iPhone SE / 12 / 14 Pro Max, an iPhone in
landscape and a Pixel 5, asserting no horizontal overflow, no sub-16px fields
(iOS zooms in on those and never back out), tappable controls, and that pages
fill the viewport under a collapsing Safari toolbar. Both need a browser once:
`npx playwright install chromium`. All of it gates every pull request in CI.

The production build is a static site — drop `dist/` on any static host, or
install it as a PWA and use it offline. `vercel.json` sets the build and, more
importantly, the SPA rewrite: without it a refresh on `/library` or
`/set/:id/learn` 404s, since those paths are routes rather than files.

### Documentation

[ARCHITECTURE.md](./ARCHITECTURE.md) covers the data model, module layout,
per-mode design, the shared grading engine, the Leitner scheduler and the route
transition handling.

### Non-goals

Accounts, cloud sync, sharing links, classes, comments, ads and telemetry are all
out of scope. If a feature needs a backend, it does not belong here.

</details>

## Licence

[MIT](./LICENSE) — free to use, change and share.

OpenQuiz is an independent project inspired by the study-mode format popularised
by tools like Quizlet. It shares no code, assets or branding with any of them, and
is not affiliated with or endorsed by any such company.
