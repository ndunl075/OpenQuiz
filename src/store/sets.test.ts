import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../lib/db'
import {
  blankSet,
  createFolder,
  deleteFolder,
  deleteSet,
  duplicateSet,
  getSet,
  listSets,
  moveSetToFolder,
  saveSet,
  toggleStar,
} from './sets'
import { recordAnswer } from './progress'

async function makeSet(title = 'Biology') {
  return saveSet({
    ...blankSet(),
    title,
    terms: [
      { id: 't1', term: 'cell', definition: 'basic unit of life', starred: false },
      { id: 't2', term: 'atom', definition: 'basic unit of matter', starred: false },
    ],
  })
}

beforeEach(async () => {
  await Promise.all([db.sets.clear(), db.folders.clear(), db.progress.clear(), db.modeStats.clear()])
})

describe('saveSet', () => {
  it('drops rows where both sides are blank and defaults the title', async () => {
    const saved = await saveSet({
      ...blankSet(),
      terms: [
        { id: 'a', term: 'cell', definition: 'unit of life', starred: false },
        { id: 'b', term: '   ', definition: '', starred: false },
      ],
    })
    expect(saved.terms).toHaveLength(1)
    expect(saved.title).toBe('Untitled set')
  })

  it('round-trips through the database', async () => {
    const saved = await makeSet()
    expect((await getSet(saved.id))?.terms).toHaveLength(2)
  })
})

describe('listSets', () => {
  it('returns the most recently updated first', async () => {
    const first = await makeSet('Older')
    await db.sets.put({ ...first, updatedAt: 1 })
    await makeSet('Newer')
    expect((await listSets()).map((s) => s.title)).toEqual(['Newer', 'Older'])
  })
})

describe('deleteSet', () => {
  it('removes the set and its progress together', async () => {
    const set = await makeSet()
    await recordAnswer(set.id, 't1', true)
    expect(await db.progress.where('setId').equals(set.id).count()).toBe(1)

    await deleteSet(set.id)
    expect(await getSet(set.id)).toBeUndefined()
    expect(await db.progress.where('setId').equals(set.id).count()).toBe(0)
  })
})

describe('duplicateSet', () => {
  it('copies with fresh ids so the original is untouched', async () => {
    const set = await makeSet()
    const copy = await duplicateSet(set.id)
    expect(copy?.id).not.toBe(set.id)
    expect(copy?.title).toBe('Biology (copy)')
    expect(copy?.terms.map((t) => t.id)).not.toEqual(set.terms.map((t) => t.id))
    expect((await getSet(set.id))?.title).toBe('Biology')
  })
})

describe('toggleStar', () => {
  it('flips a single term', async () => {
    const set = await makeSet()
    await toggleStar(set.id, 't1')
    const after = await getSet(set.id)
    expect(after?.terms.find((t) => t.id === 't1')?.starred).toBe(true)
    expect(after?.terms.find((t) => t.id === 't2')?.starred).toBe(false)
  })
})

describe('folders', () => {
  it('detaches its sets when deleted rather than deleting them', async () => {
    const folder = await createFolder('Semester 1')
    const set = await makeSet()
    await moveSetToFolder(set.id, folder.id)
    expect((await getSet(set.id))?.folderId).toBe(folder.id)

    await deleteFolder(folder.id)
    expect(await getSet(set.id)).toBeDefined()
    expect((await getSet(set.id))?.folderId).toBeUndefined()
  })
})
