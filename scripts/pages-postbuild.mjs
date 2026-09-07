/**
 * GitHub Pages has no rewrite rules, so a deep link like /OpenQuiz/library
 * would 404. Pages serves 404.html for any unmatched path, and because this is
 * a SPA that file only has to be index.html — the router then reads the URL and
 * renders the right route.
 *
 * .nojekyll stops Pages running the output through Jekyll, which would drop any
 * file or directory beginning with an underscore.
 */
import { copyFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const dist = resolve('dist')
await copyFile(resolve(dist, 'index.html'), resolve(dist, '404.html'))
await writeFile(resolve(dist, '.nojekyll'), '')
console.log('pages: wrote 404.html and .nojekyll')
