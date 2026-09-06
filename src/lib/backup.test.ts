import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './db'
import { exportLibrary, importBackup, wipeLibrary } from './backup'
import { toExport } from './exportSet'
import type { StudySet } from './types'

const set = (id: string, title: string): StudySet => ({
  id,
  title,
  description: '',
  terms: [
    { id: `${id}-a`, term: 'cell', definition: 'unit of life', starred: true },
    { id: `${id}-b`, term: 'atom', definition: 'unit of matter', starred: false },
  ],
  termLang: 'en-US',
  defLang: 'en-US',
  createdAt: 1,
  updatedAt: 2,
})

beforeEach(async () => {
  await wipeLibrary()
})

describe('exportLibrary', () => {
  it('captures sets, folders, progress and mode stats', async () => {
    await db.sets.put(set('s1', 'Biology'))
    await db.folders.put({ id: 'f1', name: 'Science', createdAt: 1 })
    await db.progress.put({
      setId: 's1',
      termId: 's1-a',
      box: 3,
      status: 'learning',
      seen: 3,
      correct: 3,
      incorrect: 0,
      lastSeen: 5,
    })
    await db.modeStats.put({
      id: 's1:match',
      setId: 's1',
      mode: 'match',
      plays: 2,
      lastPlayed: 9,
      bestMs: 8000,
    })

    const backup = await exportLibrary()
    expect(backup.format).toBe('openquiz-library')
    expect(backup.sets).toHaveLength(1)
    expect(backup.folders).toHaveLength(1)
    expect(backup.progress).toHaveLength(1)
    expect(backup.modeStats).toHaveLength(1)
  })
})

describe('importBackup', () => {
  it('round-trips a full library backup, progress included', async () => {
    await db.sets.put(set('s1', 'Biology'))
    await db.progress.put({
      setId: 's1',
      termId: 's1-a',
      box: 4,
      status: 'mastered',
      seen: 4,
      correct: 4,
      incorrect: 0,
      lastSeen: 5,
    })
    const json = JSON.stringify(await exportLibrary())

    await wipeLibrary()
    expect(await db.sets.count()).toBe(0)

    const result = await importBackup(json)
    expect(result).toEqual({ ok: true, sets: 1, kind: 'library' })
    expect((await db.sets.get('s1'))?.title).toBe('Biology')
    expect((await db.progress.get(['s1', 's1-a']))?.box).toBe(4)
  })

  it('imports a single exported set as a new set with fresh ids', async () => {
    const json = JSON.stringify(toExport(set('s1', 'Biology')))
    const result = await importBackup(json)

    expect(result).toEqual({ ok: true, sets: 1, kind: 'set' })
    const stored = await db.sets.toArray()
    expect(stored).toHaveLength(1)
    expect(stored[0].id).not.toBe('s1')
    expect(stored[0].terms.map((t) => t.id)).not.toContain('s1-a')
    expect(stored[0].terms[0].starred).toBe(true)
  })

  it('does not overwrite an existing set when importing a single set twice', async () => {
    const json = JSON.stringify(toExport(set('s1', 'Biology')))
    await importBackup(json)
    await importBackup(json)
    expect(await db.sets.count()).toBe(2)
  })

  it('rejects invalid JSON without touching the database', async () => {
    await db.sets.put(set('s1', 'Biology'))
    const result = await importBackup('{not json')
    expect(result.ok).toBe(false)
    expect(await db.sets.count()).toBe(1)
  })

  it('rejects a file that is not an OpenQuiz export', async () => {
    const result = await importBackup(JSON.stringify({ hello: 'world' }))
    expect(result).toEqual({
      ok: false,
      error: 'That file does not look like an OpenQuiz export.',
    })
    expect(await db.sets.count()).toBe(0)
  })

  it('rejects a backup whose sets have no usable terms', async () => {
    const result = await importBackup(
      JSON.stringify({ format: 'openquiz-library', version: 1, sets: [{ title: 'Empty', terms: [] }] }),
    )
    expect(result.ok).toBe(false)
    expect(await db.sets.count()).toBe(0)
  })

  it('drops malformed terms rather than importing them', async () => {
    const result = await importBackup(
      JSON.stringify({
        format: 'openquiz-set',
        title: 'Mixed',
        terms: [{ term: 'good', definition: 'fine' }, { term: 42 }, null, 'nope'],
      }),
    )
    expect(result.ok).toBe(true)
    const [stored] = await db.sets.toArray()
    expect(stored.terms).toHaveLength(1)
    expect(stored.terms[0].term).toBe('good')
  })
})

describe('wipeLibrary', () => {
  it('clears every table', async () => {
    await db.sets.put(set('s1', 'Biology'))
    await db.folders.put({ id: 'f1', name: 'Science', createdAt: 1 })
    await wipeLibrary()
    expect(await db.sets.count()).toBe(0)
    expect(await db.folders.count()).toBe(0)
  })
})
