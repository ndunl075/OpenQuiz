/**
 * Verifies the GitHub Pages build: the app served from a repo subpath rather
 * than the root. The risk this covers is asset URLs and router paths silently
 * assuming "/", and deep links, which Pages can only serve via 404.html.
 *
 * Run with `npm run test:pages`.
 */
import { chromium } from 'playwright'

const BASE = process.env.BASE_URL ?? 'http://localhost:4180/OpenQuiz'
const EXECUTABLE = process.env.CHROMIUM_PATH || undefined
const b = await chromium.launch(EXECUTABLE ? { executablePath: EXECUTABLE } : {})
const p = await b.newPage({ viewport: { width: 1280, height: 900 } })
const errs = []
p.on('pageerror', (e) => errs.push('pageerror: ' + e.message))
p.on('console', (m) => m.type() === 'error' && errs.push('console: ' + m.text().slice(0, 160)))
p.on('response', (r) => { if (r.status() >= 400 && !r.url().includes('favicon')) errs.push(`HTTP ${r.status()} ${r.url()}`) })

await p.goto(`${BASE}/`, { waitUntil: 'networkidle' })
await p.getByRole('link', { name: 'Try OpenQuiz' }).first().waitFor({ timeout: 8000 })
console.log('landing at subpath: OK')
await p.getByRole('link', { name: 'Try OpenQuiz' }).first().click()
await p.waitForURL('**/home', { timeout: 8000 })
console.log('CTA keeps the subpath:', p.url())

await p.getByRole('link', { name: /create a set/i }).click()
await p.getByLabel('Set title').fill('Pages Test')
await p.getByRole('button', { name: 'Import' }).click()
await p.getByLabel('Terms to import').fill('a\t1\nb\t2\nc\t3\nd\t4')
await p.getByRole('button', { name: /import 4 terms/i }).click()
await p.getByRole('button', { name: 'Create set' }).click()
await p.getByRole('heading', { name: 'Pages Test' }).waitFor({ timeout: 8000 })
const setUrl = p.url()
console.log('set created at:', setUrl)

// The real Pages risk: a hard load of a deep link, served via 404.html.
await p.goto(`${setUrl}/flashcards`, { waitUntil: 'networkidle' })
await p.getByText('Click or press Space to flip').waitFor({ timeout: 8000 })
console.log('deep-link hard load (404.html fallback): OK')

await p.goto(`${BASE}/library`, { waitUntil: 'networkidle' })
await p.getByRole('heading', { name: 'Your library' }).waitFor({ timeout: 8000 })
console.log('library hard load: OK')

const styled = await p.evaluate(() => getComputedStyle(document.querySelector('h1')).fontFamily)
console.log('CSS applied (font):', styled.split(',')[0])
console.log('\nerrors:', errs.length ? errs.join('\n  ') : 'none')
await b.close()
process.exit(errs.length ? 1 : 0)
