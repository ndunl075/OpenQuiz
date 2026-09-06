export type Difficulty = 'easy' | 'normal' | 'hard'

/** Seconds a term takes to fall at level 1. */
export const BASE_FALL_SECONDS: Record<Difficulty, number> = {
  easy: 14,
  normal: 10,
  hard: 7,
}

export const TERMS_PER_LEVEL = 5
export const STARTING_LIVES = 3
/** How often the fall is advanced, in milliseconds. */
export const TICK_MS = 50
const MIN_FALL_MS = 2600
const SPEEDUP_PER_LEVEL = 0.86

/** How long a term takes to fall, tightening by level and never below a floor. */
export function fallDurationMs(difficulty: Difficulty, level: number): number {
  const base = BASE_FALL_SECONDS[difficulty] * 1000
  return Math.max(MIN_FALL_MS, base * SPEEDUP_PER_LEVEL ** (level - 1))
}

/** Level from the number of terms answered so far. */
export function levelFor(answered: number): number {
  return Math.floor(answered / TERMS_PER_LEVEL) + 1
}

/**
 * Points for an answer. Higher levels are worth more, and so is catching a
 * term early — `progress` is 0 at the top of the screen and 1 at the ground.
 */
export function pointsFor(level: number, progress: number): number {
  const clamped = Math.min(1, Math.max(0, progress))
  return Math.round(100 * level * (0.5 + (1 - clamped) / 2))
}
