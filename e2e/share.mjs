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

async function step(name, fn) {
  try {
    await fn()
    console.log(`  ok   ${name}`)
  } catch (error) {
    const reason = String(error.message).split('\n')[0]
    console.log(`  FAIL ${name}: ${reason}`)
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
  await a.getByRole('heading', { name: 'Sent By Link' }).waitFor({ timeout: 10000 })

  await a.getByRole('button', { name: 'More options' }).click()
  await a.getByRole('menuitem', { name: /share as a link/i }).click()
  const field = a.getByLabel('Share link')
  await field.waitFor({ timeout: 8000 })
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

await step('a device that has never seen the app can open it', async () => {
  const receiver = await browser.newContext()
  const b = await receiver.newPage()
  b.on('pageerror', (e) => failures.push(`receiver page error: ${e.message}`))

  // Nothing may be fetched for the set itself: it is all in the URL.
  const requests = []
  b.on('request', (r) => requests.push(r.url()))

  await b.goto(link, { waitUntil: 'networkidle' })
  await b.getByRole('heading', { name: 'Sent By Link' }).waitFor({ timeout: 10000 })
  await b.getByText('café').waitFor({ timeout: 5000 })
  await b.getByText('日本語').waitFor({ timeout: 5000 })

  const leaked = requests.filter((url) => url.includes('café') || url.includes('#'))
  if (leaked.length > 0) throw new Error(`fragment reached the network: ${leaked[0]}`)

  await b.getByRole('button', { name: /add to my sets/i }).click()
  await b.getByRole('heading', { name: 'Sent By Link' }).waitFor({ timeout: 10000 })
  await b.goto(`${BASE}/library`, { waitUntil: 'networkidle' })
  await b.getByText('Sent By Link').first().waitFor({ timeout: 8000 })
  await receiver.close()
})

await step('a damaged link is explained rather than silently ignored', async () => {
  const receiver = await browser.newContext()
  const b = await receiver.newPage()
  await b.goto(`${link.slice(0, link.indexOf('#') + 12)}`, { waitUntil: 'networkidle' })
  await b.getByText(/this link didn't work/i).waitFor({ timeout: 8000 })
  await receiver.close()
})

await browser.close()

if (failures.length > 0) {
  console.error(`\n${failures.length} failure(s):`)
  for (const failure of failures) console.error(`  - ${failure}`)
  process.exit(1)
}
console.log('\nShare links round-trip between devices with nothing sent to a server.')
