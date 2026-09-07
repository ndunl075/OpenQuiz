/**
 * Plays each study mode against the production bundle and checks the loop
 * produces the right outcome - a correct answer counts, a wrong one is caught,
 * scores and mastery move. The journey only checks each mode renders.
 */
import { chromium } from 'playwright'

const BASE = process.env.BASE_URL ?? 'http://localhost:4173'
const EXECUTABLE = process.env.CHROMIUM_PATH || undefined

const PAIRS = [
  ['mitochondria', 'powerhouse of the cell'],
  ['ribosome', 'builds proteins'],
  ['nucleus', 'holds the DNA'],
  ['chloroplast', 'site of photosynthesis'],
  ['vacuole', 'stores water'],
  ['lysosome', 'breaks down waste'],
]
const DEF_OF = new Map(PAIRS)
const TAB = String.fromCharCode(9)

const failures = []
const browser = await chromium.launch(EXECUTABLE ? { executablePath: EXECUTABLE } : {})
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
const page = await context.newPage()
page.on('pageerror', (e) => failures.push(`page error: ${e.message}`))
page.on('console', (m) => m.type() === 'error' && failures.push(`console: ${m.text().slice(0, 160)}`))

async function step(name, fn) {
  try {
    await fn()
    console.log(`  ok   ${name}`)
  } catch (error) {
    const reason = String(error.message).split('\n').slice(0, 5).join(' | ')
    console.log(`  FAIL ${name}: ${reason}`)
    if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/modes-fail.png` }).catch(() => {})
    failures.push(`${name}: ${reason}`)
  }
}

/** Progress rows straight from IndexedDB, so assertions are on stored truth. */
const progressFor = (setId) =>
  page.evaluate(async (id) => {
    const open = indexedDB.open('openquiz')
    const db = await new Promise((res, rej) => {
      open.onsuccess = () => res(open.result)
      open.onerror = () => rej(open.error)
    })
    const all = await new Promise((res, rej) => {
      const r = db.transaction('progress', 'readonly').objectStore('progress').getAll()
      r.onsuccess = () => res(r.result)
      r.onerror = () => rej(r.error)
    })
    return all.filter((row) => row.setId === id)
  }, setId)

await page.goto(BASE, { waitUntil: 'networkidle' })
await page.getByRole('link', { name: 'Try OpenQuiz' }).first().click()
await page.waitForURL('**/home', { timeout: 10000 })
await page.getByRole('link', { name: /create a set/i }).click()
await page.getByLabel('Set title').fill('Cell Biology')
await page.getByRole('button', { name: 'Import' }).click()
await page.getByLabel('Terms to import').fill(PAIRS.map(([t, d]) => `${t}${TAB}${d}`).join('\n'))
await page.getByRole('button', { name: /import 6 terms/i }).click()
await page.getByRole('button', { name: 'Create set' }).click()
await page.getByRole('heading', { name: 'Cell Biology' }).waitFor({ timeout: 10000 })
const setUrl = page.url()
const setId = setUrl.split('/set/')[1]

await step('flashcards: flips both ways, navigates, and sorts', async () => {
  await page.goto(`${setUrl}/flashcards`, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /show definition/i }).click()
  await page.getByRole('button', { name: /show term/i }).waitFor({ timeout: 5000 })
  await page.getByRole('button', { name: /show term/i }).click()
  await page.getByRole('button', { name: /show definition/i }).waitFor({ timeout: 5000 })

  await page.getByRole('button', { name: 'Next card' }).click()
  await page.getByText('2 / 6').waitFor({ timeout: 5000 })
  await page.getByRole('button', { name: 'Previous card' }).click()
  await page.getByText('1 / 6').waitFor({ timeout: 5000 })

  await page.getByRole('button', { name: /sort by know/i }).click()
  await page.getByRole('button', { name: /know it/i }).click()
  await page.getByText('1 know').waitFor({ timeout: 5000 })
  await page.getByRole('button', { name: /still learning/i }).click()
  await page.getByText('1 still learning').waitFor({ timeout: 5000 })
})

await step('learn: a correct answer advances mastery', async () => {
  await page.goto(`${setUrl}/learn`, { waitUntil: 'networkidle' })
  const before = (await progressFor(setId)).reduce((n, r) => n + r.correct, 0)

  const prompt = await page.getByTestId('prompt').textContent()
  const answer = DEF_OF.get(prompt ?? '')
  if (!answer) throw new Error(`unknown prompt "${prompt}"`)
  const option = page.locator('button').filter({ hasText: new RegExp(`^[1-4]\\s*${answer}$`) })
  if (await option.count()) await option.first().click()
  else {
    await page.getByLabel('Your answer').fill(answer)
    await page.keyboard.press('Enter')
  }
  await page.getByRole('button', { name: 'Continue', exact: true }).waitFor({ timeout: 5000 })

  const after = (await progressFor(setId)).reduce((n, r) => n + r.correct, 0)
  if (after <= before) throw new Error(`correct count did not rise (${before} -> ${after})`)
})

await step('learn: a wrong answer reveals the right one', async () => {
  await page.goto(`${setUrl}/learn`, { waitUntil: 'networkidle' })
  const prompt = await page.getByTestId('prompt').textContent()
  const answer = DEF_OF.get(prompt ?? '') ?? ' '
  const wrong = page
    .locator('button')
    .filter({ hasText: /^[1-4]\S/ })
    .filter({ hasNotText: answer })
  if (await wrong.count()) {
    await wrong.first().click()
    await page.getByRole('button', { name: 'Continue', exact: true }).waitFor({ timeout: 5000 })
  } else {
    await page.getByLabel('Your answer').fill('definitely not it')
    await page.keyboard.press('Enter')
    await page.getByText(/correct answer/i).waitFor({ timeout: 5000 })
  }
})

/**
 * Reads the prompt only once it differs from `previous`. Questions cross-fade,
 * so reading straight after Continue can catch the outgoing one.
 */
async function settledPrompt(previous) {
  await page.waitForFunction(
    (before) => {
      const el = document.querySelector('[data-testid="prompt"]')
      return el !== null && el.textContent !== before
    },
    previous,
    { timeout: 8000 },
  )
  return (await page.getByTestId('prompt').textContent()) ?? ''
}

await step('write: accepts a correct answer, then forgives a typo', async () => {
  await page.goto(`${setUrl}/write`, { waitUntil: 'networkidle' })
  const first = await settledPrompt(null)
  const answer = DEF_OF.get(first)
  if (!answer) throw new Error(`unknown prompt "${first}"`)
  await page.getByLabel('Your answer').fill(answer)
  await page.keyboard.press('Enter')
  await page.getByText(/^Correct$/).waitFor({ timeout: 5000 })
  await page.getByRole('button', { name: 'Continue', exact: true }).click()

  const second = await settledPrompt(first)
  const expected = DEF_OF.get(second)
  if (!expected) throw new Error(`unknown prompt "${second}"`)
  const typo = expected.slice(0, -1)
  await page.getByLabel('Your answer').fill(typo)
  await page.keyboard.press('Enter')
  await page.waitForTimeout(400)
  const verdict = (await page.locator('[role="status"]').first().textContent()) ?? '(none)'
  if (!/watch your spelling/i.test(verdict)) {
    throw new Error(`typed "${typo}" for "${second}" (expected "${expected}") but got: ${verdict.slice(0, 90)}`)
  }
})

await step('write: a wrong answer shows the expected one and can be overridden', async () => {
  await page.goto(`${setUrl}/write`, { waitUntil: 'networkidle' })
  const prompt = await settledPrompt(null)
  const expected = DEF_OF.get(prompt)
  if (!expected) throw new Error(`unknown prompt "${prompt}"`)
  await page.getByLabel('Your answer').fill('definitely not it')
  await page.keyboard.press('Enter')
  await page.getByText(/correct answer/i).waitFor({ timeout: 5000 })
  // The revealed answer must be the one for the prompt on screen.
  const shown = (await page.locator('[role="status"]').first().textContent()) ?? ''
  if (!shown.includes(expected)) {
    throw new Error(`prompt "${prompt}" revealed "${shown.slice(0, 60)}", expected "${expected}"`)
  }
  await page.getByRole('button', { name: /i was right/i }).click()
  await page.getByText(/^Correct$/).waitFor({ timeout: 5000 })
})

await step('spell: audio prompt, and a wrong spelling is shown back', async () => {
  await page.goto(`${setUrl}/spell`, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /play the audio again/i }).waitFor({ timeout: 5000 })
  await page.getByLabel(/type what you hear/i).fill('zzzz')
  await page.keyboard.press('Enter')
  await page.getByText(/the correct spelling is/i).waitFor({ timeout: 5000 })
})

await step('test: answering everything correctly scores 100%', async () => {
  await page.goto(`${setUrl}/test`, { waitUntil: 'networkidle' })
  for (const label of ['Multiple choice', 'True / false', 'Matching']) {
    const toggle = page.getByRole('switch', { name: label })
    if ((await toggle.getAttribute('aria-checked')) === 'true') await toggle.click()
  }
  await page.getByLabel(/question count/i).fill('4')
  await page.getByRole('button', { name: 'Start test' }).click()
  await page.getByText('Question 1').waitFor({ timeout: 5000 })

  const cards = await page.getByRole('group').all()
  for (const [i, card] of cards.entries()) {
    const prompt = (await card.locator('p').first().textContent())?.trim() ?? ''
    const answer = DEF_OF.get(prompt)
    if (!answer) throw new Error(`unknown prompt "${prompt}"`)
    await card.getByLabel(`Answer for question ${i + 1}`).fill(answer)
  }
  await page.getByRole('button', { name: 'Submit test' }).click()
  await page.getByText('100%').waitFor({ timeout: 8000 })
})

await step('match: clearing the board records a best time', async () => {
  await page.goto(`${setUrl}/match`, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Start game' }).click()
  await page.getByText('12 tiles left').waitFor({ timeout: 5000 })
  for (const [term, def] of PAIRS) {
    const tile = page.getByRole('button', { name: term, exact: true })
    if (!(await tile.count())) continue
    await tile.click()
    await page.getByRole('button', { name: def, exact: true }).click()
  }
  await page.getByText(/new personal best|board cleared/i).waitFor({ timeout: 8000 })
})

await step('gravity: a correct answer scores', async () => {
  await page.goto(`${setUrl}/gravity`, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Start game' }).click()
  const falling = await page.getByTestId('falling-prompt').textContent()
  const answer = DEF_OF.get(falling ?? '')
  if (!answer) throw new Error(`unknown falling term "${falling}"`)
  await page.getByLabel(/type the answer/i).fill(answer)
  await page.keyboard.press('Enter')
  await page.getByText(/^[1-9]\d*$/).first().waitFor({ timeout: 5000 })
})

await step('stats reflects everything that was studied', async () => {
  await page.goto(`${BASE}/stats`, { waitUntil: 'networkidle' })
  await page.getByText('Cell Biology').first().waitFor({ timeout: 5000 })
  await page.getByText(/best match/i).waitFor({ timeout: 5000 })
  await page.getByText(/best test 100%/i).waitFor({ timeout: 5000 })
})

await browser.close()

if (failures.length > 0) {
  console.error(`\n${failures.length} failure(s):`)
  for (const failure of failures) console.error(`  - ${failure}`)
  process.exit(1)
}
console.log('\nEvery mode plays correctly against the production build.')
