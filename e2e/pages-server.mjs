/**
 * Mimics GitHub Pages closely enough to test against: serves dist/ under a repo
 * subpath and falls back to 404.html for anything it cannot find, which is how
 * Pages makes a single-page app work without rewrite rules.
 */
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'

const ROOT = process.argv[2]
const PREFIX = process.env.PAGES_PREFIX ?? '/OpenQuiz'
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2', '.woff': 'font/woff' }

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x')
  if (!url.pathname.startsWith(PREFIX)) { res.writeHead(404); return res.end('not found') }
  const rel = url.pathname.slice(PREFIX.length) || '/'
  const file = join(ROOT, normalize(rel === '/' ? '/index.html' : rel))
  try {
    const body = await readFile(file)
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' })
    res.end(body)
  } catch {
    const body = await readFile(join(ROOT, '404.html'))
    res.writeHead(404, { 'content-type': 'text/html' })
    res.end(body)
  }
}).listen(Number(process.env.PAGES_PORT ?? 4180))
