/**
 * Phone layout checks against the built app.
 *
 * Asserts the things that actually break on small screens and on iOS in
 * particular: horizontal overflow, content clipped by a collapsing Safari
 * toolbar, controls too small to tap, and fields small enough to trigger
 * iOS's zoom-on-focus (which never zooms back out).
 */
import { chromium, devices } from 'playwright'

const BASE = process.env.BASE_URL ?? 'http://localhost:4173'
const EXECUTABLE = process.env.CHROMIUM_PATH || undefined

const PROFILES = [
  ['iPhone SE', devices['iPhone SE']],
  ['iPhone 12', devices['iPhone 12']],
  ['iPhone 14 Pro Max', devices['iPhone 14 Pro Max']],
  ['iPhone 12 landscape', devices['iPhone 12 landscape']],
  ['Pixel 5', devices['Pixel 5']],
]

const failures = []
const browser = await chromium.launch(EXECUTABLE ? { executablePath: EXECUTABLE } : {})

function note(profile, message) {
  failures.push(`${profile}: ${message}`)
  console.log(`  FAIL ${profile}: ${message}`)
}

/** Anything wider than the viewport means a horizontal scrollbar on a phone. */
async function checkNoOverflow(page, profile, where) {
  const overflow = await page.evaluate(() => {
    const docWidth = document.documentElement.clientWidth
    const widest = [...document.querySelectorAll('body *')]
      .map((el) => {
        const r = el.getBoundingClientRect()
        return { right: Math.round(r.right), left: Math.round(r.left), el }
      })
      .filter((m) => m.right > docWidth + 1 || m.left < -1)
      .slice(0, 3)
      .map(
        (m) =>
          `<${(m.el.tagName || '').toLowerCase()} class="${String(m.el.className).slice(0, 70)}"> L${m.left} R${m.right}`,
      )
    // A scrolling element that is itself in-bounds can still push the page wide.
    const scrollers = [...document.querySelectorAll('body *')]
      // Deliberately does NOT skip clipped containers: clipping hides content
      // that is genuinely too wide, which is exactly what this should catch.
      .filter((el) => el.scrollWidth > el.clientWidth + 1)
      .slice(0, 3)
      .map((el) => `scrollWidth <${el.tagName.toLowerCase()} class="${String(el.className).slice(0, 60)}"> ${el.scrollWidth}>${el.clientWidth}`)
    widest.push(...scrollers)
    return {
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: docWidth,
      culprits: widest,
    }
  })
  if (overflow.scrollWidth > overflow.clientWidth + 1) {
    note(
      profile,
      `${where} overflows horizontally (${overflow.scrollWidth} > ${overflow.clientWidth}) — ${overflow.culprits.join('; ')}`,
    )
  }
}

/** iOS Safari zooms in on focus when a field renders below 16px. */
async function checkNoZoomOnFocus(page, profile, where) {
  const small = await page.evaluate(() =>
    [...document.querySelectorAll('input, select, textarea')]
      .filter((el) => {
        // Only editable text fields trigger the zoom; a file picker, range or
        // checkbox never receives text input.
        const exempt = ['file', 'range', 'checkbox', 'radio', 'color', 'submit', 'button']
        if (el.tagName === 'INPUT' && exempt.includes(el.type)) return false
        const style = getComputedStyle(el)
        return style.display !== 'none' && parseFloat(style.fontSize) < 16
      })
      .map((el) => `${el.tagName.toLowerCase()}[${el.getAttribute('aria-label') ?? el.id ?? ''}] ${getComputedStyle(el).fontSize}`)
      .slice(0, 4),
  )
  if (small.length > 0) note(profile, `${where} has sub-16px fields (iOS will zoom): ${small.join(', ')}`)
}

/**
 * Icon-sized controls should be comfortably tappable. Inline text links are
 * exempt — they are as tall as their line box by design — so this only flags
 * controls that are small in BOTH dimensions.
 */
async function checkTapTargets(page, profile, where) {
  const tiny = await page.evaluate(() =>
    [...document.querySelectorAll('button, a[href]')]
      .filter((el) => {
        const r = el.getBoundingClientRect()
        // 44px is the platform guidance; flag anything that misses it in
        // either direction once the control is not an inline run of text.
        // Sub-pixel layout at a 3x device ratio reports a 44px box as 43.99,
        // so allow half a pixel of slack rather than chasing rounding.
        const MIN = 43.5
        const isInlineText = (el.textContent ?? '').trim().length > 0 && el.tagName === 'A'
        if (isInlineText) return false
        return r.width > 0 && r.height > 0 && (r.height < MIN || r.width < MIN)
      })
      .map((el) => {
        const r = el.getBoundingClientRect()
        const size = (n) => n.toFixed(1)
        return `${el.tagName.toLowerCase()}[${el.getAttribute('aria-label') ?? (el.textContent ?? '').trim().slice(0, 20)}] ${size(r.width)}x${size(r.height)}`
      })
      .slice(0, 4),
  )
  if (tiny.length > 0) note(profile, `${where} has controls under 44px: ${tiny.join(', ')}`)
}

/**
 * The page must reach the bottom of the viewport. Study modes use `dvh` so that
 * holds while Safari's toolbar is collapsed as well as expanded.
 */
async function checkFillsViewport(page, profile, where) {
  const result = await page.evaluate(() => ({
    height: Math.round(document.body.getBoundingClientRect().height),
    inner: window.innerHeight,
  }))
  if (result.height < result.inner - 2) {
    note(profile, `${where} leaves ${result.inner - result.height}px of dead space below the fold`)
  }
}

/**
 * An open dialog must sit entirely inside the viewport, footer included.
 * Regression: the overlay's safe-area padding once replaced its 1rem frame
 * rather than adding to it, leaving the dialog flush against both edges.
 */
async function checkDialogFits(page, profile, where) {
  const box = await page.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"]')
    if (!dialog) return null
    const r = dialog.getBoundingClientRect()
    const footer = dialog.querySelector('footer')
    return {
      top: Math.round(r.top),
      bottom: Math.round(r.bottom),
      left: Math.round(r.left),
      right: Math.round(r.right),
      footerBottom: footer ? Math.round(footer.getBoundingClientRect().bottom) : null,
      vh: window.innerHeight,
      vw: window.innerWidth,
    }
  })
  if (!box) {
    note(profile, `${where}: expected an open dialog`)
    return
  }
  if (box.top < 0 || box.bottom > box.vh || box.left < 0 || box.right > box.vw) {
    note(profile, `${where}: dialog escapes the viewport (${JSON.stringify(box)})`)
  }
  if (box.footerBottom !== null && box.footerBottom > box.vh) {
    note(profile, `${where}: dialog footer is below the fold (${box.footerBottom} > ${box.vh})`)
  }
}

for (const [profile, device] of PROFILES) {
  const context = await browser.newContext({ ...device })
  const page = await context.newPage()
  page.on('pageerror', (e) => note(profile, `page error: ${e.message}`))

  // Landing
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.getByRole('link', { name: 'Try OpenQuiz' }).first().waitFor({ timeout: 10000 })
  await checkNoOverflow(page, profile, 'landing')
  await checkTapTargets(page, profile, 'landing')

  // Into the app and build a set
  await page.getByRole('link', { name: 'Try OpenQuiz' }).first().click()
  await page.waitForURL('**/home', { timeout: 10000 })
  await checkNoOverflow(page, profile, 'home')

  await page.getByRole('link', { name: /create a set/i }).click()
  await page.getByLabel('Set title').fill('Cell Biology')
  await checkNoZoomOnFocus(page, profile, 'editor')
  await page.getByRole('button', { name: 'Import' }).click()
  await page
    .getByLabel('Terms to import')
    .fill(
      [
        'mitochondria\tpowerhouse of the cell',
        'ribosome\tbuilds proteins',
        'nucleus\tholds the DNA',
        'chloroplast\tsite of photosynthesis',
        'vacuole\tstores water',
        'lysosome\tbreaks down waste',
      ].join('\n'),
    )
  await checkNoOverflow(page, profile, 'import dialog')
  await checkNoZoomOnFocus(page, profile, 'import dialog')
  await checkDialogFits(page, profile, 'import dialog')
  await page.getByRole('button', { name: /import 6 terms/i }).click()
  await page.getByRole('button', { name: 'Create set' }).click()
  await page.getByRole('heading', { name: 'Cell Biology' }).waitFor({ timeout: 10000 })
  const setUrl = page.url()
  await checkNoOverflow(page, profile, 'set page')
  await checkTapTargets(page, profile, 'set page')

  for (const mode of ['flashcards', 'learn', 'write', 'spell', 'test', 'match', 'gravity']) {
    await page.goto(`${setUrl}/${mode}`, { waitUntil: 'networkidle' })
    if (mode === 'test') await page.getByRole('button', { name: 'Start test' }).click()
    if (mode === 'match' || mode === 'gravity') {
      await page.getByRole('button', { name: 'Start game' }).click()
    }
    await page.waitForTimeout(350)
    await checkNoOverflow(page, profile, mode)
    await checkNoZoomOnFocus(page, profile, mode)
    await checkFillsViewport(page, profile, mode)
  }

  await page.goto(`${BASE}/library`, { waitUntil: 'networkidle' })
  await checkNoOverflow(page, profile, 'library')
  await checkNoZoomOnFocus(page, profile, 'library')
  await page.goto(`${BASE}/settings`, { waitUntil: 'networkidle' })
  await checkNoOverflow(page, profile, 'settings')
  await checkNoZoomOnFocus(page, profile, 'settings')
  await page.goto(`${BASE}/stats`, { waitUntil: 'networkidle' })
  await checkNoOverflow(page, profile, 'stats')

  console.log(`  ok   ${profile}`)
  await context.close()
}

await browser.close()

if (failures.length > 0) {
  console.error(`\n${failures.length} phone layout problem(s).`)
  process.exit(1)
}
console.log('\nAll phone profiles clean.')
