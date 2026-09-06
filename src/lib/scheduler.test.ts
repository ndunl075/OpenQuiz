import { describe, expect, it } from 'vitest'
import {
  applyAnswer,
  buildRound,
  emptyProgress,
  questionKindForBox,
  tallyMastery,
} from './scheduler'
import type { Progress, Term } from './types'

const term = (id: string): Term => ({ id, term: id, definition: `def-${id}`, starred: false })
const progress = (termId: string, box: number): Progress => ({
  ...emptyProgress('s1', termId),
  box,
  status: box >= 4 ? 'mastered' : box > 0 ? 'learning' : 'new',
})

describe('applyAnswer', () => {
  it('promotes one box on a correct answer', () => {
    const next = applyAnswer(emptyProgress('s1', 't1'), true)
    expect(next.box).toBe(1)
    expect(next.status).toBe('learning')
    expect(next.correct).toBe(1)
  })

  it('demotes two boxes on a miss and floors at zero', () => {
    expect(applyAnswer(progress('t1', 3), false).box).toBe(1)
    expect(applyAnswer(progress('t1', 1), false).box).toBe(0)
  })

  it('marks mastered at box 4 and caps at 5', () => {
    expect(applyAnswer(progress('t1', 3), true).status).toBe('mastered')
    expect(applyAnswer(progress('t1', 5), true).box).toBe(5)
  })
})

describe('questionKindForBox', () => {
  it('uses multiple choice early and written later', () => {
    expect(questionKindForBox(0)).toBe('choice')
    expect(questionKindForBox(1)).toBe('choice')
    expect(questionKindForBox(2)).toBe('written')
  })
})

describe('buildRound', () => {
  const terms = ['a', 'b', 'c', 'd', 'e'].map(term)

  it('excludes mastered terms', () => {
    const map = new Map([['a', progress('a', 4)]])
    const round = buildRound(terms, map, { size: 10 })
    expect(round.map((t) => t.id)).not.toContain('a')
    expect(round).toHaveLength(4)
  })

  it('returns nothing once everything is mastered', () => {
    const map = new Map(terms.map((t) => [t.id, progress(t.id, 5)]))
    expect(buildRound(terms, map)).toEqual([])
  })

  it('caps the round at the requested size', () => {
    expect(buildRound(terms, new Map(), { size: 2 })).toHaveLength(2)
  })

  it('avoids repeating the previous term first', () => {
    const round = buildRound(terms, new Map(), { size: 3, lastTermId: 'a', rng: () => 0 })
    expect(round[0].id).not.toBe('a')
  })

  it('prefers the lowest boxes first', () => {
    const map = new Map([
      ['a', progress('a', 3)],
      ['b', progress('b', 0)],
    ])
    const round = buildRound([term('a'), term('b')], map, { size: 1, rng: () => 0 })
    expect(round[0].id).toBe('b')
  })
})

describe('tallyMastery', () => {
  it('counts mastered, learning and remaining', () => {
    const terms = ['a', 'b', 'c', 'd'].map(term)
    const map = new Map([
      ['a', progress('a', 5)],
      ['b', progress('b', 2)],
    ])
    expect(tallyMastery(terms, map)).toEqual({
      total: 4,
      mastered: 1,
      learning: 1,
      remaining: 3,
      percent: 25,
    })
  })
})
