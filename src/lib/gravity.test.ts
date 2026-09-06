import { describe, expect, it } from 'vitest'
import {
  BASE_FALL_SECONDS,
  TERMS_PER_LEVEL,
  fallDurationMs,
  levelFor,
  pointsFor,
} from './gravity'

describe('fallDurationMs', () => {
  it('starts at the difficulty base time', () => {
    expect(fallDurationMs('normal', 1)).toBe(BASE_FALL_SECONDS.normal * 1000)
    expect(fallDurationMs('easy', 1)).toBeGreaterThan(fallDurationMs('hard', 1))
  })

  it('gets faster every level', () => {
    expect(fallDurationMs('normal', 2)).toBeLessThan(fallDurationMs('normal', 1))
    expect(fallDurationMs('normal', 5)).toBeLessThan(fallDurationMs('normal', 2))
  })

  it('never falls below a playable floor', () => {
    expect(fallDurationMs('hard', 50)).toBe(2600)
  })
})

describe('levelFor', () => {
  it('advances a level every five answers', () => {
    expect(levelFor(0)).toBe(1)
    expect(levelFor(TERMS_PER_LEVEL - 1)).toBe(1)
    expect(levelFor(TERMS_PER_LEVEL)).toBe(2)
    expect(levelFor(TERMS_PER_LEVEL * 3)).toBe(4)
  })
})

describe('pointsFor', () => {
  it('rewards catching a term early', () => {
    expect(pointsFor(1, 0)).toBeGreaterThan(pointsFor(1, 0.9))
  })

  it('scales with the level', () => {
    expect(pointsFor(3, 0.5)).toBe(pointsFor(1, 0.5) * 3)
  })

  it('is bounded at the top and bottom of the screen', () => {
    expect(pointsFor(1, 0)).toBe(100)
    expect(pointsFor(1, 1)).toBe(50)
    expect(pointsFor(1, -5)).toBe(100)
    expect(pointsFor(1, 5)).toBe(50)
  })
})
