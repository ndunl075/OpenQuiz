import { describe, expect, it } from 'vitest'
import {
  DEFAULT_TEST_CONFIG,
  MATCHING_GROUP_SIZE,
  buildTest,
  totalWeight,
  type TestConfig,
} from './buildTest'
import type { Term } from './types'

const terms: Term[] = Array.from({ length: 12 }, (_, i) => ({
  id: `t${i}`,
  term: `term-${i}`,
  definition: `def-${i}`,
  starred: i < 3,
}))

const config = (patch: Partial<TestConfig> = {}): TestConfig => ({
  ...DEFAULT_TEST_CONFIG,
  ...patch,
})

describe('buildTest', () => {
  it('produces the requested number of questions', () => {
    expect(buildTest(terms, config({ questionCount: 6 }))).toHaveLength(6)
  })

  it('never repeats a term within one test', () => {
    const questions = buildTest(terms, config({ questionCount: 12 }))
    const used = questions.flatMap((q) => (q.type === 'matching' ? q.pairs : [q.term]))
    expect(new Set(used.map((t) => t.id)).size).toBe(used.length)
  })

  it('only emits the enabled question types', () => {
    const questions = buildTest(
      terms,
      config({ types: { written: true, choice: false, trueFalse: false, matching: false } }),
    )
    expect(questions.every((q) => q.type === 'written')).toBe(true)
  })

  it('spreads questions across the enabled types', () => {
    const questions = buildTest(
      terms,
      config({
        questionCount: 8,
        types: { written: true, choice: true, trueFalse: false, matching: false },
      }),
    )
    const kinds = new Set(questions.map((q) => q.type))
    expect(kinds).toEqual(new Set(['written', 'choice']))
  })

  it('gives multiple choice four options including the right one', () => {
    const questions = buildTest(
      terms,
      config({ types: { written: false, choice: true, trueFalse: false, matching: false } }),
    )
    for (const question of questions) {
      if (question.type !== 'choice') continue
      expect(question.choices).toHaveLength(4)
      expect(question.choices.map((c) => c.id)).toContain(question.term.id)
    }
  })

  it('falls back to written when a type has too few terms to be meaningful', () => {
    const two = terms.slice(0, 2)
    const questions = buildTest(
      two,
      config({ types: { written: false, choice: true, trueFalse: false, matching: false } }),
    )
    expect(questions.every((q) => q.type === 'written')).toBe(true)
  })

  it('labels true/false questions consistently with what they show', () => {
    const questions = buildTest(
      terms,
      config({
        questionCount: 12,
        types: { written: false, choice: false, trueFalse: true, matching: false },
      }),
    )
    for (const question of questions) {
      if (question.type !== 'trueFalse') continue
      expect(question.isTrue).toBe(question.shown === question.expected)
    }
  })

  it('groups matching questions and counts each pair separately', () => {
    const questions = buildTest(
      terms,
      config({
        questionCount: 10,
        types: { written: false, choice: false, trueFalse: false, matching: true },
      }),
    )
    expect(questions).toHaveLength(2)
    for (const question of questions) {
      expect(question.type).toBe('matching')
      if (question.type === 'matching') {
        expect(question.pairs).toHaveLength(MATCHING_GROUP_SIZE)
        expect(question.answers).toHaveLength(MATCHING_GROUP_SIZE)
      }
    }
    expect(totalWeight(questions)).toBe(10)
  })

  it('restricts to starred terms when asked', () => {
    const questions = buildTest(terms, config({ questionCount: 10, starredOnly: true }))
    const used = questions.flatMap((q) => (q.type === 'matching' ? q.pairs : [q.term]))
    expect(used.every((t) => t.starred)).toBe(true)
  })

  it('ignores the starred filter when nothing is starred', () => {
    const none = terms.map((t) => ({ ...t, starred: false }))
    expect(buildTest(none, config({ starredOnly: true })).length).toBeGreaterThan(0)
  })

  it('swaps the prompt side on request', () => {
    const [question] = buildTest(
      terms,
      config({
        questionCount: 1,
        promptSide: 'definition',
        types: { written: true, choice: false, trueFalse: false, matching: false },
      }),
    )
    if (question.type === 'matching') throw new Error('unexpected matching question')
    expect(question.prompt).toBe(question.term.definition)
    expect(question.expected).toBe(question.term.term)
  })

  it('returns nothing when no type is enabled or there are no terms', () => {
    expect(
      buildTest(terms, config({ types: { written: false, choice: false, trueFalse: false, matching: false } })),
    ).toEqual([])
    expect(buildTest([], config())).toEqual([])
  })
})
