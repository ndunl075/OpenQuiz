/**
 * The share-link round trip in a real browser: build a link from one set,
 * open it in a fresh profile that has never seen the app, and add it.
 */
import { chromium } from 'playwright'

const BASE = process.env.BASE_URL ?? 'http://localhost:4173'
const EXECUTABLE = process.env.CHROMIUM_PATH || undefined
const TAB = String.fromCharCode(9)

const failures = []
const browser = await chromium.launch(EXECUTABLE ? { executablePath: EXECUTABLE } : {})

/** Generous: the receiving context loads the whole app cold on a shared CI runner. */
const WAIT = 25_000

async function step(name, fn, page) {
  try {
    await fn()
    console.log(`  ok   ${name}`)
  } catch (error) {
    const reason = String(error.message).split('\n')[0]
    console.log(`  FAIL ${name}: ${reason}`)
    if (page) {
      const heading = await page.locator('h1').first().textContent().catch(() => '(none)')
      const body = ((await page.textContent('body').catch(() => '')) ?? '').replace(/\s+/g, ' ')
      console.log(`       url: ${page.url().slice(0, 120)}`)
      console.log(`       h1: ${heading}`)
      console.log(`       body: ${body.slice(0, 200)}`)
    }
    failures.push(`${name}: ${reason}`)
  }
}

const sender = await browser.newContext()
const a = await sender.newPage()
a.on('pageerror', (e) => failures.push(`sender page error: ${e.message}`))
let link = ''

await step('a set can be shared as a link', async () => {
  await a.goto(`${BASE}/create`, { waitUntil: 'networkidle' })
  await a.getByLabel('Set title').fill('Sent By Link')
  await a.getByRole('button', { name: 'Import' }).click()
  await a
    .getByLabel('Terms to import')
    .fill(`café${TAB}coffee\nnaïve${TAB}unworldly\n日本語${TAB}Japanese\ndelta${TAB}fourth`)
  await a.getByRole('button', { name: /import 4 terms/i }).click()
  await a.getByRole('button', { name: 'Create set' }).click()
  await a.getByRole('heading', { name: 'Sent By Link' }).waitFor({ timeout: WAIT })

  await a.getByRole('button', { name: 'More options' }).click()
  await a.getByRole('menuitem', { name: /share as a link/i }).click()
  const field = a.getByLabel('Share link')
  await field.waitFor({ timeout: WAIT })
  for (let i = 0; i < 40 && !link.startsWith('http'); i++) {
    link = (await field.inputValue()).trim()
    if (!link.startsWith('http')) await a.waitForTimeout(100)
  }
  if (!link.startsWith('http')) throw new Error(`no link built, got "${link}"`)
  if (!link.includes('#')) throw new Error('link has no fragment')
})

await step('the payload rides in the fragment, not the path or query', async () => {
  const url = new URL(link)
  if (url.search !== '') throw new Error(`query string present: ${url.search}`)
  if (url.hash.length < 20) throw new Error('fragment too short to hold the set')
  if (!url.pathname.endsWith('/shared')) throw new Error(`unexpected path ${url.pathname}`)
})

const receiver = await browser.newContext()
const b = await receiver.newPage()
b.on('pageerror', (e) => failures.push(`receiver page error: ${e.message}`))

// Nothing may be fetched for the set itself: it is all in the URL.
const requests = []
b.on('request', (r) => requests.push(r.url()))

await step(
  'the link opens on a device that has never seen the app',
  async () => {
    await b.goto(link, { waitUntil: 'domcontentloaded' })
    await b.getByText('Shared with you').waitFor({ timeout: WAIT })
    await b.getByRole('heading', { name: 'Sent By Link' }).waitFor({ timeout: WAIT })
  },
  b,
)

await step(
  'the shared terms are readable before anything is saved',
  async () => {
    await b.getByText('café').waitFor({ timeout: WAIT })
    await b.getByText('日本語').waitFor({ timeout: WAIT })
    await b.getByText(/nothing is saved until you add it/i).waitFor({ timeout: WAIT })
  },
  b,
)

await step('the fragment never reached the network', async () => {
  const leaked = requests.filter((url) => url.includes('café') || url.includes('#'))
  if (leaked.length > 0) throw new Error(`fragment reached the network: ${leaked[0]}`)
})

await step(
  'adding it saves the set to the receiving library',
  async () => {
    await b.getByRole('button', { name: /add to my sets/i }).click()
    await b.waitForURL(/\/set\//, { timeout: WAIT })
    await b.goto(`${BASE}/library`, { waitUntil: 'domcontentloaded' })
    await b.getByText('Sent By Link').first().waitFor({ timeout: WAIT })
  },
  b,
)

await receiver.close()

await step('a damaged link is explained rather than silently ignored', async () => {
  const context = await browser.newContext()
  const page = await context.newPage()
  await page.goto(`${link.slice(0, link.indexOf('#') + 12)}`, { waitUntil: 'domcontentloaded' })
  await page.getByText(/this link didn't work/i).waitFor({ timeout: WAIT })
  await context.close()
})

await browser.close()

if (failures.length > 0) {
  console.error(`\n${failures.length} failure(s):`)
  for (const failure of failures) console.error(`  - ${failure}`)
  process.exit(1)
}
console.log('\nShare links round-trip between devices with nothing sent to a server.')
