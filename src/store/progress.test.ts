import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../lib/db'
import { loadModeStats, loadProgress, recordAnswer, recordModeStats, resetProgress, setKnown } from './progress'

beforeEach(async () => {
  await Promise.all([db.progress.clear(), db.modeStats.clear()])
})

describe('recordAnswer', () => {
  it('creates progress on first answer and accumulates after', async () => {
    expect((await recordAnswer('s1', 't1', true)).box).toBe(1)
    expect((await recordAnswer('s1', 't1', true)).box).toBe(2)
    const stored = await loadProgress('s1')
    expect(stored.get('t1')?.correct).toBe(2)
    expect(stored.get('t1')?.seen).toBe(2)
  })

  it('keeps progress per set', async () => {
    await recordAnswer('s1', 't1', true)
    await recordAnswer('s2', 't1', true)
    expect((await loadProgress('s1')).size).toBe(1)
    expect((await loadProgress('s2')).size).toBe(1)
  })
})

describe('setKnown', () => {
  it('records the flashcards bucket without touching the box', async () => {
    await recordAnswer('s1', 't1', true)
    const next = await setKnown('s1', 't1', true)
    expect(next.known).toBe(true)
    expect(next.box).toBe(1)
  })
})

describe('resetProgress', () => {
  it('clears only the given set', async () => {
    await recordAnswer('s1', 't1', true)
    await recordAnswer('s2', 't1', true)
    await resetProgress('s1')
    expect((await loadProgress('s1')).size).toBe(0)
    expect((await loadProgress('s2')).size).toBe(1)
  })
})

describe('recordModeStats', () => {
  it('keeps the lowest time and the highest score', async () => {
    await recordModeStats('s1', 'match', { ms: 9000 })
    await recordModeStats('s1', 'match', { ms: 12000 })
    const stats = await loadModeStats('s1')
    expect(stats.get('match')?.bestMs).toBe(9000)
    expect(stats.get('match')?.plays).toBe(2)

    await recordModeStats('s1', 'test', { score: 60 })
    await recordModeStats('s1', 'test', { score: 90 })
    expect((await loadModeStats('s1')).get('test')?.bestScore).toBe(90)
  })
})
