/**
 * Proves the central claim: a set made in the browser is stored on the device
 * and never leaves it, no matter who is hosting the app.
 *
 * Uses a persistent browser profile on disk, so closing and reopening it is a
 * real browser restart rather than a page reload.
 */
import { chromium } from 'playwright'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const BASE = process.env.BASE_URL ?? 'http://localhost:4173'
const EXECUTABLE = process.env.CHROMIUM_PATH || undefined

/** Unique per run, so finding it in a request body is unambiguous. */
const SECRET_TERM = `xylophagous-${Date.now()}`
const SECRET_DEF = `eats-wood-${Date.now()}`

const failures = []
function note(message) {
  failures.push(message)
  console.log(`  FAIL ${message}`)
}
async function step(name, fn) {
  try {
    await fn()
    console.log(`  ok   ${name}`)
  } catch (error) {
    note(`${name}: ${String(error.message).split('\n')[0]}`)
  }
}

const launch = (dir) =>
  chromium.launchPersistentContext(dir, {
    ...(EXECUTABLE ? { executablePath: EXECUTABLE } : {}),
    viewport: { width: 1280, height: 900 },
  })

/** Every request the page makes, so we can prove none carried the content. */
function watchTraffic(page, sink) {
  page.on('request', (request) => {
    const post = request.postData() ?? ''
    sink.push({ url: request.url(), method: request.method(), post })
  })
}

async function createSet(page) {
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.getByRole('link', { name: 'Try OpenQuiz' }).first().click()
  await page.waitForURL('**/home', { timeout: 10000 })
  await page.getByRole('link', { name: /create a set/i }).click()
  await page.getByLabel('Set title').fill('Device Storage Proof')
  await page.getByRole('button', { name: 'Import' }).click()
  await page.getByLabel('Terms to import').fill(
    [`${SECRET_TERM}\t${SECRET_DEF}`, 'beta\ttwo', 'gamma\tthree', 'delta\tfour'].join('\n'),
  )
  await page.getByRole('button', { name: /import 4 terms/i }).click()
  await page.getByRole('button', { name: 'Create set' }).click()
  await page.getByRole('heading', { name: 'Device Storage Proof' }).waitFor({ timeout: 10000 })
  return page.url()
}

/** Reads the set straight out of IndexedDB, bypassing the UI. */
const readDb = (page) =>
  page.evaluate(async () => {
    const open = indexedDB.open('openquiz')
    const db = await new Promise((resolve, reject) => {
      open.onsuccess = () => resolve(open.result)
      open.onerror = () => reject(open.error)
    })
    const read = (store) =>
      new Promise((resolve, reject) => {
        const request = db.transaction(store, 'readonly').objectStore(store).getAll()
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })
    return { sets: await read('sets'), progress: await read('progress') }
  })

const profile = await mkdtemp(join(tmpdir(), 'openquiz-profile-'))
const otherProfile = await mkdtemp(join(tmpdir(), 'openquiz-other-'))
let setUrl = ''

// ── 1. Make a set, watching every byte that leaves the page ──────────────────
{
  const context = await launch(profile)
  const page = await context.newPage()
  const traffic = []
  watchTraffic(page, traffic)
  page.on('pageerror', (e) => note(`page error: ${e.message}`))

  await step('a set can be created', async () => {
    setUrl = await createSet(page)
  })

  await step('the set is in IndexedDB on this device', async () => {
    const { sets } = await readDb(page)
    const set = sets.find((s) => s.title === 'Device Storage Proof')
    if (!set) throw new Error('set not found in IndexedDB')
    if (!set.terms.some((t) => t.term === SECRET_TERM)) throw new Error('term missing from IndexedDB')
  })

  await step('nothing the user typed was sent anywhere', async () => {
    const leaks = traffic.filter(
      (r) => r.url.includes(SECRET_TERM) || r.post.includes(SECRET_TERM) || r.post.includes(SECRET_DEF),
    )
    if (leaks.length > 0) {
      throw new Error(`${leaks.length} request(s) carried the content: ${leaks[0].method} ${leaks[0].url}`)
    }
  })

  await step('the app makes no third-party requests at all', async () => {
    const origin = new URL(BASE).origin
    const external = traffic.filter((r) => !r.url.startsWith(origin) && !r.url.startsWith('data:') && !r.url.startsWith('blob:'))
    if (external.length > 0) {
      throw new Error(`${external.length} off-origin request(s), first: ${external[0].url}`)
    }
  })

  await step('no request uploads a body at all', async () => {
    const withBody = traffic.filter((r) => r.post.length > 0)
    if (withBody.length > 0) throw new Error(`${withBody.length} request(s) had a body`)
  })

  // Record some study progress so we can prove that persists too.
  await step('studying records progress', async () => {
    await page.goto(`${setUrl}/flashcards`, { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: /sort by know/i }).click()
    await page.getByRole('button', { name: /know it/i }).click()
    await page.waitForTimeout(600)
    const { progress } = await readDb(page)
    if (progress.length === 0) throw new Error('no progress rows written')
  })

  await context.close()
}

// ── 2. Restart the browser entirely; the data must still be there ────────────
{
  const context = await launch(profile)
  const page = await context.newPage()

  await step('the set survives closing and reopening the browser', async () => {
    await page.goto(BASE, { waitUntil: 'networkidle' })
    // A returning visitor skips the landing page, which itself proves the
    // library was read back from disk.
    await page.waitForURL('**/home', { timeout: 10000 })
    await page.getByText('Device Storage Proof').first().waitFor({ timeout: 10000 })
  })

  await step('the terms and progress survive the restart', async () => {
    const { sets, progress } = await readDb(page)
    const set = sets.find((s) => s.title === 'Device Storage Proof')
    if (!set) throw new Error('set gone after restart')
    if (!set.terms.some((t) => t.term === SECRET_TERM)) throw new Error('term gone after restart')
    if (progress.length === 0) throw new Error('progress gone after restart')
  })

  await step('the set is still there with the network switched off', async () => {
    await context.setOffline(true)
    await page.goto(`${setUrl}/flashcards`, { waitUntil: 'domcontentloaded', timeout: 15000 })
    await page.getByText('Click or press Space to flip').waitFor({ timeout: 10000 })
    await context.setOffline(false)
  })

  await context.close()
}

// ── 3. A different profile is a different device: it must see nothing ────────
{
  const context = await launch(otherProfile)
  const page = await context.newPage()

  await step('a different browser profile sees none of it', async () => {
    await page.goto(BASE, { waitUntil: 'networkidle' })
    // No sets on this "device", so the landing page shows rather than /home.
    await page.getByRole('link', { name: 'Try OpenQuiz' }).first().waitFor({ timeout: 10000 })
    const { sets } = await readDb(page)
    if (sets.length > 0) throw new Error(`expected an empty library, found ${sets.length} set(s)`)
  })

  await context.close()
}

await rm(profile, { recursive: true, force: true })
await rm(otherProfile, { recursive: true, force: true })

if (failures.length > 0) {
  console.error(`\n${failures.length} failure(s).`)
  process.exit(1)
}
console.log('\nStorage is local to the device, and nothing the user types leaves the browser.')
