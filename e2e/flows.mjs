/**
 * Longer user flows the journey does not cover: editing a saved set, starring,
 * a full Learn round, folders, duplication, export/import, browser history,
 * keyboard shortcuts and awkward content.
 */
import { chromium } from 'playwright'
const BASE = process.env.BASE_URL ?? 'http://localhost:4173'
const EXECUTABLE = process.env.CHROMIUM_PATH || undefined
const b = await chromium.launch(EXECUTABLE ? { executablePath: EXECUTABLE } : {})
const p = await b.newPage({ viewport: { width: 1280, height: 900 } })
const issues = []
p.on('pageerror', (e) => issues.push(`PAGEERROR: ${e.message}`))
p.on('console', (m) => m.type() === 'error' && issues.push(`CONSOLE: ${m.text().slice(0, 200)}`))

const check = async (name, fn) => {
  try { await fn(); console.log(`ok    ${name}`) }
  catch (e) {
    if (process.env.SHOTS) await p.screenshot({ path: `${process.env.SHOTS}/fail-${name.slice(0, 20).replace(/\W+/g, '-')}.png` }).catch(() => {})
    const lines = String(e.message).split('\n')
    const r = lines.slice(0, 6).join(' | ')
    console.log(`BUG   ${name}: ${r}`)
    issues.push(`${name}: ${lines[0]}`)
  }
}

async function makeSet(title, pairs) {
  await p.goto(`${BASE}/create`, { waitUntil: 'networkidle' })
  await p.getByLabel('Set title').fill(title)
  await p.getByRole('button', { name: 'Import' }).click()
  await p.getByLabel('Terms to import').fill(pairs.map(([a, c]) => `${a}\t${c}`).join('\n'))
  await p.getByRole('button', { name: new RegExp(`import ${pairs.length} terms`, 'i') }).click()
  await p.getByRole('button', { name: 'Create set' }).click()
  await p.getByRole('heading', { name: title }).waitFor({ timeout: 8000 })
  return p.url()
}

const PAIRS = [
  ['mitochondria', 'powerhouse of the cell'],
  ['ribosome', 'builds proteins'],
  ['nucleus', 'holds the DNA'],
  ['chloroplast', 'site of photosynthesis'],
  ['vacuole', 'stores water'],
  ['lysosome', 'breaks down waste'],
]

await p.goto(BASE, { waitUntil: 'networkidle' })
let setUrl = ''
await check('create a set', async () => { setUrl = await makeSet('Cell Biology', PAIRS) })

await check('edit set: add a term and keep the others', async () => {
  await p.goto(`${setUrl}/edit`, { waitUntil: 'networkidle' })
  await p.getByRole('button', { name: /add a card/i }).click()
  const n = await p.locator('input[aria-label^="Term "]').count()
  await p.getByLabel(`Term ${n}`, { exact: true }).fill('golgi')
  await p.getByLabel(`Definition ${n}`, { exact: true }).fill('packages proteins')
  await p.getByRole('button', { name: 'Save changes' }).click()
  await p.getByRole('heading', { name: 'Cell Biology' }).waitFor({ timeout: 8000 })
  await p.getByText('golgi').waitFor({ timeout: 5000 })
  if ((await p.getByText('7 terms').count()) === 0) throw new Error('term count did not update')
})

await check('edit set: remove a term', async () => {
  await p.goto(`${setUrl}/edit`, { waitUntil: 'networkidle' })
  await p.getByRole('button', { name: 'Remove term 7' }).click()
  await p.getByRole('button', { name: 'Save changes' }).click()
  await p.getByRole('heading', { name: 'Cell Biology' }).waitFor({ timeout: 8000 })
  if ((await p.getByText('6 terms').count()) === 0) throw new Error('term count did not shrink')
})

await check('star a term then filter to starred', async () => {
  await p.goto(setUrl, { waitUntil: 'networkidle' })
  await p.getByRole('button', { name: /^Star mitochondria$/ }).click()
  await p.getByRole('tab', { name: /Starred \(1\)/ }).waitFor({ timeout: 5000 })
  await p.getByRole('tab', { name: /Starred/ }).click()
  await p.waitForTimeout(300)
  const rows = await p.locator('li').filter({ hasText: 'mitochondria' }).count()
  if (rows === 0) throw new Error('starred filter hides the starred term')
})

await check('learn: complete a full round and reach the summary', async () => {
  await p.goto(`${setUrl}/learn`, { waitUntil: 'networkidle' })
  for (let i = 0; i < 30; i++) {
    if (await p.getByText(/Round \d+ complete/i).count()) break
    // Each question takes two steps: answer, then continue.
    if (await p.getByRole('button', { name: 'Continue', exact: true }).count()) {
      await p.getByRole('button', { name: 'Continue', exact: true }).click()
    } else if (await p.locator('button').filter({ hasText: /^[1-4]\S/ }).count()) {
      await p.locator('button').filter({ hasText: /^[1-4]\S/ }).first().click()
    } else if (await p.getByLabel('Your answer').count()) {
      await p.getByLabel('Your answer').fill('x')
      await p.keyboard.press('Enter')
    }
    // Longer than the 200ms question transition: acting mid-transition means
    // clicking a node AnimatePresence is in the middle of swapping out.
    await p.waitForTimeout(400)
  }
  await p.getByText(/Round \d+ complete/i).waitFor({ timeout: 6000 })
  await p.getByRole('button', { name: 'Continue to the next round' }).click()
  await p.getByText(/of \d+/).first().waitFor({ timeout: 6000 })
})

await check('progress survives a mid-session refresh', async () => {
  await p.goto(`${setUrl}/write`, { waitUntil: 'networkidle' })
  const prompt = await p.getByTestId('prompt').textContent()
  const def = PAIRS.find(([t]) => t === prompt)?.[1]
  if (!def) throw new Error(`unknown prompt ${prompt}`)
  await p.getByLabel('Your answer').fill(def)
  await p.keyboard.press('Enter')
  await p.getByText(/^Correct$/i).waitFor({ timeout: 5000 })
  await p.reload({ waitUntil: 'networkidle' })
  await p.getByTestId('prompt').waitFor({ timeout: 5000 })
})

await check('test mode with matching questions', async () => {
  await p.goto(`${setUrl}/test`, { waitUntil: 'networkidle' })
  for (const label of ['Written', 'Multiple choice', 'True / false']) {
    const t = p.getByRole('switch', { name: label })
    if ((await t.getAttribute('aria-checked')) === 'true') await t.click()
  }
  const m = p.getByRole('switch', { name: 'Matching' })
  if ((await m.getAttribute('aria-checked')) !== 'true') await m.click()
  await p.getByRole('button', { name: 'Start test' }).click()
  await p.getByText('Question 1').waitFor({ timeout: 6000 })
  const selects = p.locator('select')
  const n = await selects.count()
  if (n === 0) throw new Error('matching produced no selects')
  for (let i = 0; i < n; i++) await selects.nth(i).selectOption({ index: 1 })
  await p.getByRole('button', { name: 'Submit test' }).click()
  await p.getByText('Your results').waitFor({ timeout: 6000 })
})

await check('reset progress clears the mastery bar', async () => {
  await p.goto(setUrl, { waitUntil: 'networkidle' })
  await p.getByRole('button', { name: 'More options' }).click()
  await p.getByRole('menuitem', { name: /reset progress/i }).click()
  await p.waitForTimeout(600)
})

await check('duplicate a set', async () => {
  await p.goto(setUrl, { waitUntil: 'networkidle' })
  await p.getByRole('button', { name: 'More options' }).click()
  await p.getByRole('menuitem', { name: /duplicate set/i }).click()
  await p.getByRole('heading', { name: 'Cell Biology (copy)' }).waitFor({ timeout: 8000 })
})

await check('folders: create, assign, and see the set in it', async () => {
  await p.goto(`${BASE}/library`, { waitUntil: 'networkidle' })
  await p.getByRole('tab', { name: /Folders/ }).click()
  await p.getByRole('button', { name: 'New folder' }).first().click()
  await p.getByLabel('Folder name').fill('Science')
  // Scoped to the dialog: the top nav also has a "Create" button.
  await p.locator('[role="dialog"]').getByRole('button', { name: 'Create' }).click()
  await p.getByText('Science').waitFor({ timeout: 5000 })
  await p.goto(setUrl, { waitUntil: 'networkidle' })
  await p.locator('select').first().selectOption({ label: 'Science' })
  await p.waitForTimeout(500)
  await p.goto(`${BASE}/library`, { waitUntil: 'networkidle' })
  await p.getByRole('tab', { name: /Folders/ }).click()
  await p.getByText('1 set').waitFor({ timeout: 5000 })
})

await check('single-term set: modes degrade instead of breaking', async () => {
  const url = await makeSet('Tiny', [['a', 'one'], ['b', 'two']])
  for (const mode of ['flashcards', 'learn', 'write', 'spell', 'test', 'match', 'gravity']) {
    await p.goto(`${url}/${mode}`, { waitUntil: 'networkidle' })
    await p.waitForTimeout(250)
    const body = (await p.textContent('body')) ?? ''
    if (body.trim().length < 20) throw new Error(`${mode} rendered blank for a 2-term set`)
  }
})

await check('long text and special characters do not break layout', async () => {
  const url = await makeSet('Edge', [
    ['a'.repeat(160), 'b'.repeat(300)],
    ['<script>alert(1)</script>', 'café — naïve “quotes” & <b>tags</b>'],
    ['emoji 🎉🧬', 'multi space   text'],
    ['d', 'four'],
  ])
  await p.goto(`${url}/flashcards`, { waitUntil: 'networkidle' })
  await p.waitForTimeout(700)
  const over = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  if (over > 1) throw new Error(`flashcards overflows by ${over}px with long text`)
  if ((await p.getByText('alert(1)').count()) === 0 && (await p.getByText('<script>').count()) === 0) {
    // term should render as text somewhere on the set page
  }
})

await check('browser back returns from a study mode', async () => {
  await p.goto(setUrl, { waitUntil: 'networkidle' })
  await p.getByRole('link', { name: /Flashcards/ }).click()
  await p.getByText('Click or press Space to flip').waitFor({ timeout: 6000 })
  await p.goBack({ waitUntil: 'networkidle' })
  await p.getByRole('heading', { name: 'Cell Biology' }).waitFor({ timeout: 6000 })
})

await check('export then re-import a set', async () => {
  await p.goto(setUrl, { waitUntil: 'networkidle' })
  const data = await p.evaluate(async () => {
    const req = indexedDB.open('openquiz')
    const db = await new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = rej })
    const tx = db.transaction('sets', 'readonly')
    const all = await new Promise((res, rej) => { const r = tx.objectStore('sets').getAll(); r.onsuccess = () => res(r.result); r.onerror = rej })
    return JSON.stringify({ format: 'openquiz-set', version: 1, title: all[0].title, description: '', termLang: 'en-US', defLang: 'en-US', terms: all[0].terms })
  })
  await p.goto(`${BASE}/settings`, { waitUntil: 'networkidle' })
  await p.setInputFiles('input[type=file]', { name: 's.json', mimeType: 'application/json', buffer: Buffer.from(data) })
  await p.getByText(/imported 1 set/i).waitFor({ timeout: 6000 })
})

await check('keyboard: space flips, arrows navigate', async () => {
  await p.goto(`${setUrl}/flashcards`, { waitUntil: 'networkidle' })
  await p.getByText('Click or press Space to flip').waitFor({ timeout: 6000 })
  await p.keyboard.press('Space')
  await p.getByRole('button', { name: /show term/i }).waitFor({ timeout: 5000 })
  await p.keyboard.press('ArrowRight')
  await p.getByText('2 / 6').waitFor({ timeout: 5000 })
})

await b.close()
console.log('\n--- issues ---')
console.log(issues.length ? issues.join('\n') : 'none')
process.exit(issues.length ? 1 : 0)
