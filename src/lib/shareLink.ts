import { newId } from './id'
import type { StudySet, Term } from './types'

/**
 * Sets encoded into a link, so one can be sent to another device with no
 * account, no server and no file.
 *
 * The payload lives in the URL *fragment*, which browsers never send to the
 * server. Even hosted, the terms reach only the person opening the link.
 *
 * Gzip via CompressionStream where available; term lists are repetitive text
 * and compress to roughly a third. Without it the JSON is encoded as-is, which
 * still works for smaller sets.
 */

export interface SharePayload {
  v: 1
  t: string
  d: string
  tl: string
  dl: string
  /** [term, definition] pairs — shorter than objects, and this goes in a URL. */
  c: Array<[string, string]>
}

/**
 * Most browsers accept far more, but Safari has historically been the limit and
 * a link that silently fails to open is worse than one the app refuses to make.
 */
export const MAX_LINK_LENGTH = 14_000

function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4))
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

/**
 * Fed through the stream's writer rather than a Blob, which jsdom cannot
 * stream.
 *
 * Both writer promises are caught rather than left floating. A damaged link is
 * an expected input, and decompressing one rejects on the writer as well as on
 * the read — unhandled, that surfaces as an unhandled rejection in the console
 * instead of the error message the caller is ready to show.
 */
async function pipe(bytes: Uint8Array, transform: TransformStream): Promise<Response> {
  const writer = transform.writable.getWriter()
  const ignore = () => {}
  writer.write(bytes).catch(ignore)
  writer.close().catch(ignore)
  return new Response(transform.readable)
}

async function gzip(text: string): Promise<Uint8Array | null> {
  if (typeof CompressionStream === 'undefined') return null
  const response = await pipe(new TextEncoder().encode(text), new CompressionStream('gzip'))
  return new Uint8Array(await response.arrayBuffer())
}

async function gunzip(bytes: Uint8Array): Promise<string> {
  return (await pipe(bytes, new DecompressionStream('gzip'))).text()
}

export function toPayload(set: StudySet): SharePayload {
  return {
    v: 1,
    t: set.title,
    d: set.description,
    tl: set.termLang,
    dl: set.defLang,
    c: set.terms.map((term) => [term.term, term.definition]),
  }
}

/** The fragment for a share link, without the leading `#`. */
export async function encodeSet(set: StudySet): Promise<string> {
  const json = JSON.stringify(toPayload(set))
  const compressed = await gzip(json)
  return compressed
    ? `z${toBase64Url(compressed)}`
    : `p${toBase64Url(new TextEncoder().encode(json))}`
}

export async function buildShareLink(set: StudySet, origin: string, basePath = '/'): Promise<string> {
  const base = `${origin}${basePath.endsWith('/') ? basePath : `${basePath}/`}shared`
  return `${base}#${await encodeSet(set)}`
}

export type DecodeResult =
  | { ok: true; payload: SharePayload }
  | { ok: false; error: string }

function isPayload(value: unknown): value is SharePayload {
  if (typeof value !== 'object' || value === null) return false
  const payload = value as Record<string, unknown>
  return (
    payload.v === 1 &&
    typeof payload.t === 'string' &&
    Array.isArray(payload.c) &&
    payload.c.every(
      (pair) =>
        Array.isArray(pair) &&
        pair.length === 2 &&
        typeof pair[0] === 'string' &&
        typeof pair[1] === 'string',
    )
  )
}

export async function decodeSet(fragment: string): Promise<DecodeResult> {
  const raw = fragment.startsWith('#') ? fragment.slice(1) : fragment
  if (!raw) return { ok: false, error: 'That link has no set in it.' }
  try {
    const bytes = fromBase64Url(raw.slice(1))
    const json =
      raw[0] === 'z'
        ? await gunzip(bytes)
        : raw[0] === 'p'
          ? new TextDecoder().decode(bytes)
          : null
    if (json === null) return { ok: false, error: "That link isn't an OpenQuiz set." }
    const parsed: unknown = JSON.parse(json)
    if (!isPayload(parsed)) return { ok: false, error: "That link isn't an OpenQuiz set." }
    return { ok: true, payload: parsed }
  } catch {
    return { ok: false, error: 'That link looks damaged — it may have been cut short.' }
  }
}

/** A shared payload as a set ready to save, with ids of its own. */
export function payloadToSet(payload: SharePayload): StudySet {
  const now = Date.now()
  const terms: Term[] = payload.c
    .filter(([term, definition]) => term.trim() || definition.trim())
    .map(([term, definition]) => ({ id: newId(), term, definition, starred: false }))
  return {
    id: newId(),
    title: payload.t.trim() || 'Shared set',
    description: typeof payload.d === 'string' ? payload.d : '',
    terms,
    termLang: typeof payload.tl === 'string' ? payload.tl : 'en-US',
    defLang: typeof payload.dl === 'string' ? payload.dl : 'en-US',
    createdAt: now,
    updatedAt: now,
  }
}
