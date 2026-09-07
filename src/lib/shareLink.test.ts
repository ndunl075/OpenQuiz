import { describe, expect, it } from 'vitest'
import {
  MAX_LINK_LENGTH,
  buildShareLink,
  decodeSet,
  encodeSet,
  payloadToSet,
} from './shareLink'
import type { StudySet } from './types'

const set = (overrides: Partial<StudySet> = {}): StudySet => ({
  id: 's1',
  title: 'Cell Biology',
  description: 'Organelles',
  terms: [
    { id: 't1', term: 'mitochondria', definition: 'powerhouse of the cell', starred: true },
    { id: 't2', term: 'ribosome', definition: 'builds proteins', starred: false },
  ],
  termLang: 'es-ES',
  defLang: 'en-US',
  createdAt: 1,
  updatedAt: 2,
  ...overrides,
})

describe('encode and decode', () => {
  it('round-trips a set', async () => {
    const result = await decodeSet(await encodeSet(set()))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.payload.t).toBe('Cell Biology')
    expect(result.payload.c).toEqual([
      ['mitochondria', 'powerhouse of the cell'],
      ['ribosome', 'builds proteins'],
    ])
    expect(result.payload.tl).toBe('es-ES')
  })

  it('survives characters that would break a naive encoder', async () => {
    const tricky = set({
      title: 'Español & "quotes" — 日本語 🎉',
      terms: [{ id: 't1', term: 'café/naïve', definition: 'a+b=c?d#e', starred: false }],
    })
    const result = await decodeSet(await encodeSet(tricky))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.payload.t).toBe('Español & "quotes" — 日本語 🎉')
    expect(result.payload.c[0]).toEqual(['café/naïve', 'a+b=c?d#e'])
  })

  it('produces a fragment that is URL-safe', async () => {
    const fragment = await encodeSet(set())
    expect(fragment).toMatch(/^[zp][A-Za-z0-9_-]+$/)
  })

  it('tolerates a leading hash', async () => {
    const fragment = await encodeSet(set())
    expect((await decodeSet(`#${fragment}`)).ok).toBe(true)
  })
})

describe('buildShareLink', () => {
  it('puts the payload in the fragment, which never reaches a server', async () => {
    const link = await buildShareLink(set(), 'https://openquiz.example')
    const url = new URL(link)
    expect(url.pathname).toBe('/shared')
    expect(url.search).toBe('')
    expect(url.hash.length).toBeGreaterThan(1)
  })

  it('respects a base path, for a subpath deploy', async () => {
    const link = await buildShareLink(set(), 'https://example.github.io', '/OpenQuiz/')
    expect(new URL(link).pathname).toBe('/OpenQuiz/shared')
  })

  it('keeps a realistic set well inside the length limit', async () => {
    const big = set({
      terms: Array.from({ length: 100 }, (_, i) => ({
        id: `t${i}`,
        term: `term number ${i}`,
        definition: `a reasonably wordy definition for term number ${i}`,
        starred: false,
      })),
    })
    const link = await buildShareLink(big, 'https://openquiz.example')
    expect(link.length).toBeLessThan(MAX_LINK_LENGTH)
  })
})

describe('decodeSet rejections', () => {
  it('rejects an empty fragment', async () => {
    expect(await decodeSet('')).toEqual({ ok: false, error: 'That link has no set in it.' })
  })

  it('rejects an unknown encoding marker', async () => {
    const result = await decodeSet('xSGVsbG8')
    expect(result.ok).toBe(false)
  })

  it('rejects JSON that is not a share payload', async () => {
    const json = btoa(JSON.stringify({ hello: 'world' }))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
    const result = await decodeSet(`p${json}`)
    expect(result).toEqual({ ok: false, error: "That link isn't an OpenQuiz set." })
  })

  it('reports a truncated link rather than throwing', async () => {
    const fragment = await encodeSet(set())
    const result = await decodeSet(fragment.slice(0, Math.floor(fragment.length / 2)))
    expect(result.ok).toBe(false)
  })
})

describe('payloadToSet', () => {
  it('creates a new set with fresh ids and no borrowed progress', async () => {
    const result = await decodeSet(await encodeSet(set()))
    if (!result.ok) throw new Error('decode failed')
    const created = payloadToSet(result.payload)

    expect(created.id).not.toBe('s1')
    expect(created.terms.map((t) => t.id)).not.toContain('t1')
    expect(created.terms.every((t) => t.starred === false)).toBe(true)
    expect(created.title).toBe('Cell Biology')
    expect(created.termLang).toBe('es-ES')
  })

  it('drops empty rows and falls back to a usable title', () => {
    const created = payloadToSet({
      v: 1,
      t: '   ',
      d: '',
      tl: 'en-US',
      dl: 'en-US',
      c: [
        ['good', 'fine'],
        ['   ', '  '],
      ],
    })
    expect(created.title).toBe('Shared set')
    expect(created.terms).toHaveLength(1)
  })
})
