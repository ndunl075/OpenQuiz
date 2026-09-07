/**
 * Serves the production build, runs a browser suite against it, then shuts the
 * server down. `node e2e/run.mjs` runs the journey; `mobile`, `flows`,
 * `modes` and `persistence` run the other suites.
 */
import { spawn } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'

/**
 * Always rebuild for the root before serving. The Pages suite rebuilds dist/
 * for a repo subpath, and without this a later suite would serve that build at
 * the root, 404 every asset, and fail for a reason that has nothing to do with
 * what it is testing.
 */
function build() {
  return new Promise((resolve, reject) => {
    const child = spawn('npm', ['run', 'build'], {
      stdio: 'ignore',
      env: { ...process.env, BASE_PATH: '/' },
    })
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`build exited ${code}`))))
  })
}

const PORT = 4173
const BASE = `http://localhost:${PORT}`

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
let server
try {
  await build()
  server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
    stdio: 'ignore',
    detached: true,
  })
  await waitForServer()
  const suites = {
    mobile: 'e2e/mobile.mjs',
    flows: 'e2e/flows.mjs',
    persistence: 'e2e/persistence.mjs',
    modes: 'e2e/modes.mjs',
    share: 'e2e/share.mjs',
  }
  const script = suites[process.argv[2]] ?? 'e2e/journey.mjs'
  const journey = spawn('node', [script], {
    stdio: 'inherit',
    env: { ...process.env, BASE_URL: BASE },
  })
  code = await new Promise((resolve) => journey.on('exit', resolve))
} catch (error) {
  console.error(String(error.message))
} finally {
  if (server) {
    try {
      process.kill(-server.pid)
    } catch {
      // already gone
    }
  }
}
process.exit(code ?? 1)
