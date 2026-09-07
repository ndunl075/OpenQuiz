/**
 * Serves the production build, runs a browser suite against it, then shuts the
 * server down. `node e2e/run.mjs` runs the journey; `mobile` runs the phone
 * layout checks; `flows` runs the longer user flows.
 */
import { spawn } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'

const PORT = 4173
const BASE = `http://localhost:${PORT}`

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
  stdio: 'ignore',
  detached: true,
})

async function waitForServer(timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const response = await fetch(BASE)
      if (response.ok) return
    } catch {
      // not up yet
    }
    await sleep(250)
  }
  throw new Error(`preview server did not start on ${BASE}`)
}

let code = 1
try {
  await waitForServer()
  const suites = { mobile: 'e2e/mobile.mjs', flows: 'e2e/flows.mjs' }
  const script = suites[process.argv[2]] ?? 'e2e/journey.mjs'
  const journey = spawn('node', [script], {
    stdio: 'inherit',
    env: { ...process.env, BASE_URL: BASE },
  })
  code = await new Promise((resolve) => journey.on('exit', resolve))
} catch (error) {
  console.error(String(error.message))
} finally {
  try {
    process.kill(-server.pid)
  } catch {
    // already gone
  }
}
process.exit(code ?? 1)
