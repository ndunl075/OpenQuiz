import { describe, expect, it } from 'vitest'
import { sample, shuffle } from './shuffle'

describe('shuffle', () => {
  it('keeps every element and never mutates the input', () => {
    const input = [1, 2, 3, 4, 5]
    const out = shuffle(input)
    expect(out).not.toBe(input)
    expect([...out].sort()).toEqual(input)
    expect(input).toEqual([1, 2, 3, 4, 5])
  })

  it('is deterministic for a fixed rng', () => {
    const rng = () => 0
    expect(shuffle([1, 2, 3], rng)).toEqual(shuffle([1, 2, 3], rng))
  })
})

describe('sample', () => {
  it('takes at most count items', () => {
    expect(sample([1, 2, 3], 2)).toHaveLength(2)
    expect(sample([1, 2, 3], 9)).toHaveLength(3)
    expect(sample([1, 2, 3], -1)).toHaveLength(0)
  })
})
