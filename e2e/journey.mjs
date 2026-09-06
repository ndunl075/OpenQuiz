/**
 * End-to-end journey: creates a set, visits every study mode, and asserts the
 * app never logs a console or page error along the way.
 *
 * Run against a served build:  npm run test:e2e
 *
 * These are the checks unit tests cannot make — that the app actually paints,
 * that routes mount without remounting, and that clicking things works.
 */
import { chromium } from 'playwright'

const BASE = process.env.BASE_URL ?? 'http://localhost:4173'
const EXECUTABLE = process.env.CHROMIUM_PATH || undefined

const failures = []
const browser = await chromium.launch(EXECUTABLE ? { executablePath: EXECUTABLE } : {})
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })

page.on('console', (m) => m.type() === 'error' && failures.push(`console: ${m.text()}`))
page.on('pageerror', (e) => failures.push(`pageerror: ${e.message}`))

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

const TERMS = [
  ['mitochondria', 'powerhouse of the cell'],
  ['ribosome', 'builds proteins'],
  ['nucleus', 'holds the DNA'],
  ['chloroplast', 'site of photosynthesis'],
  ['vacuole', 'stores water'],
  ['lysosome', 'breaks down waste'],
]

let setUrl = ''

await step('home renders the first-run hero', async () => {
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.getByRole('heading', { name: /every study mode/i }).waitFor({ timeout: 10000 })
})

await step('a set can be created by pasting terms', async () => {
  await page.getByRole('link', { name: /create your first set/i }).click()
  await page.getByLabel('Set title').fill('Cell Biology')
  await page.getByLabel('Set description').fill('Organelles and what they do')
  await page.getByRole('button', { name: 'Import' }).click()
  await page
    .getByLabel('Terms to import')
    .fill(TERMS.map(([term, definition]) => `${term}\t${definition}`).join('\n'))
  // Regression: the editor used to remount mid-transition and drop this modal.
  await page.getByRole('button', { name: /import 6 terms/i }).click()
  await page.getByRole('button', { name: 'Create set' }).click()
  await page.getByRole('heading', { name: 'Cell Biology' }).waitFor({ timeout: 10000 })
  setUrl = page.url()
})

await step('a new route starts scrolled to the top', async () => {
  const y = await page.evaluate(() => window.scrollY)
  if (y !== 0) throw new Error(`scrollY is ${y}`)
})

await step('flashcards flips and navigates', async () => {
  await page.goto(`${setUrl}/flashcards`, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /show definition/i }).click()
  await page.getByRole('button', { name: /show term/i }).waitFor({ timeout: 5000 })
  await page.getByRole('button', { name: 'Next card' }).click()
  await page.getByText('2 / 6').waitFor({ timeout: 5000 })
})

await step('learn serves and grades a question', async () => {
  await page.goto(`${setUrl}/learn`, { waitUntil: 'networkidle' })
  await page.getByText(/choose the answer|write the answer/i).first().waitFor({ timeout: 5000 })
  const options = page.locator('button').filter({ hasText: /^[1-4]\S/ })
  if (await options.count()) {
    await options.first().click()
    await page.getByRole('button', { name: /^Continue/ }).click()
  }
})

await step('write grades a typed answer', async () => {
  await page.goto(`${setUrl}/write`, { waitUntil: 'networkidle' })
  await page.getByTestId('prompt').waitFor({ timeout: 5000 })
  await page.getByLabel('Your answer').fill('deliberately wrong')
  await page.keyboard.press('Enter')
  await page.getByText(/correct answer/i).waitFor({ timeout: 5000 })
})

await step('spell offers a replayable audio prompt', async () => {
  await page.goto(`${setUrl}/spell`, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /play the audio again/i }).waitFor({ timeout: 5000 })
})

await step('test generates and grades an exam', async () => {
  await page.goto(`${setUrl}/test`, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Start test' }).click()
  await page.getByText('Question 1').waitFor({ timeout: 5000 })
  await page.getByRole('button', { name: 'Submit test' }).click()
  await page.getByText('Your results').waitFor({ timeout: 5000 })
})

await step('match clears a matched pair', async () => {
  await page.goto(`${setUrl}/match`, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Start game' }).click()
  await page.getByText('12 tiles left').waitFor({ timeout: 5000 })
  await page.getByRole('button', { name: TERMS[0][0], exact: true }).click()
  await page.getByRole('button', { name: TERMS[0][1], exact: true }).click()
  await page.getByText('10 tiles left').waitFor({ timeout: 5000 })
})

await step('gravity drops a term', async () => {
  await page.goto(`${setUrl}/gravity`, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Start game' }).click()
  await page.getByTestId('falling-prompt').waitFor({ timeout: 5000 })
})

await step('stats reports the set', async () => {
  await page.goto(`${BASE}/stats`, { waitUntil: 'networkidle' })
  await page.getByText('Cell Biology').first().waitFor({ timeout: 5000 })
})

await step('library finds a set by a word inside its terms', async () => {
  await page.goto(`${BASE}/library`, { waitUntil: 'networkidle' })
  await page.getByLabel('Filter sets').fill('photosynthesis')
  await page.getByText('Cell Biology').first().waitFor({ timeout: 5000 })
})

await step('the theme toggle reaches the document', async () => {
  await page.goto(`${BASE}/settings`, { waitUntil: 'networkidle' })
  await page.getByRole('tab', { name: 'Dark' }).click()
  await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark', {
    timeout: 5000,
  })
  await page.getByRole('tab', { name: 'Light' }).click()
})

await step('every nav destination is reachable on a phone', async () => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(BASE, { waitUntil: 'networkidle' })
  const nav = page.getByRole('navigation', { name: 'Primary' })
  await nav.getByRole('link', { name: 'Your library' }).click()
  await page.getByRole('heading', { name: 'Your library' }).waitFor({ timeout: 5000 })
  await nav.getByRole('link', { name: 'Stats' }).click()
  await page.getByRole('heading', { name: 'Stats' }).waitFor({ timeout: 5000 })
})

await browser.close()

if (failures.length > 0) {
  console.error(`\n${failures.length} failure(s):`)
  for (const failure of failures) console.error(`  - ${failure}`)
  process.exit(1)
}
console.log('\nAll journeys passed with no console or page errors.')
