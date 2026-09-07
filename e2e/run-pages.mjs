/**
 * Builds for a repo subpath, serves it the way GitHub Pages does, and runs the
 * subpath checks. Separate from run.mjs because it needs its own build.
 */
import { spawn } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'

const PORT = 4180
const BASE = `http://localhost:${PORT}/OpenQuiz`

function run(cmd, args, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: 'inherit', env: { ...process.env, ...env } })
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))))
  })
}

let code = 1
let server
try {
  await run('npm', ['run', 'build'], { BASE_PATH: '/OpenQuiz/' })
  await run('node', ['scripts/pages-postbuild.mjs'])

  server = spawn('node', ['e2e/pages-server.mjs', 'dist'], { stdio: 'ignore', detached: true })
  const deadline = Date.now() + 30000
  for (;;) {
    try {
      if ((await fetch(`${BASE}/`)).ok) break
    } catch {
      // not up yet
    }
    if (Date.now() > deadline) throw new Error('pages server did not start')
    await sleep(250)
  }

  const check = spawn('node', ['e2e/pages.mjs'], {
    stdio: 'inherit',
    env: { ...process.env, BASE_URL: BASE },
  })
  code = await new Promise((resolve) => check.on('exit', resolve))
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
