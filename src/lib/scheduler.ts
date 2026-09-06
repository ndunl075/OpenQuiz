import type { Progress, SetId, Term, TermId } from './types'

export const MASTERED_BOX = 4
export const MAX_BOX = 5

export function emptyProgress(setId: SetId, termId: TermId): Progress {
  return {
    setId,
    termId,
    box: 0,
    status: 'new',
    seen: 0,
    correct: 0,
    incorrect: 0,
    lastSeen: 0,
  }
}

function statusForBox(box: number): Progress['status'] {
  if (box >= MASTERED_BOX) return 'mastered'
  if (box > 0) return 'learning'
  return 'new'
}

/**
 * Leitner update. A correct answer promotes one box; a miss demotes two,
 * so a term you keep failing keeps coming back soon.
 */
export function applyAnswer(progress: Progress, correct: boolean, now = Date.now()): Progress {
  const box = correct ? Math.min(MAX_BOX, progress.box + 1) : Math.max(0, progress.box - 2)
  return {
    ...progress,
    box,
    status: statusForBox(box),
    seen: progress.seen + 1,
    correct: progress.correct + (correct ? 1 : 0),
    incorrect: progress.incorrect + (correct ? 0 : 1),
    lastSeen: now,
  }
}

export type QuestionKind = 'choice' | 'written'

/** Low boxes get multiple choice; once it sticks, you have to write it. */
export function questionKindForBox(box: number): QuestionKind {
  return box <= 1 ? 'choice' : 'written'
}

export interface RoundOptions {
  size?: number
  /** Term id served immediately before, to avoid back-to-back repeats. */
  lastTermId?: TermId
  rng?: () => number
}

/**
 * Build the next round: unmastered terms, lowest box first, lightly
 * randomised so the order is not identical every round.
 */
export function buildRound(
  terms: readonly Term[],
  progressById: ReadonlyMap<TermId, Progress>,
  { size = 7, lastTermId, rng = Math.random }: RoundOptions = {},
): Term[] {
  const pending = terms.filter(
    (t) => (progressById.get(t.id)?.box ?? 0) < MASTERED_BOX,
  )
  if (pending.length === 0) return []

  const scored = pending.map((term) => {
    const box = progressById.get(term.id)?.box ?? 0
    return { term, weight: box + rng() * 0.9 }
  })
  scored.sort((a, b) => a.weight - b.weight)

  const picked = scored.slice(0, Math.min(size, scored.length)).map((s) => s.term)
  if (picked.length > 1 && picked[0].id === lastTermId) {
    ;[picked[0], picked[1]] = [picked[1], picked[0]]
  }
  return picked
}

export interface MasteryTally {
  total: number
  mastered: number
  learning: number
  remaining: number
  percent: number
}

export function tallyMastery(
  terms: readonly Term[],
  progressById: ReadonlyMap<TermId, Progress>,
): MasteryTally {
  let mastered = 0
  let learning = 0
  for (const term of terms) {
    const status = progressById.get(term.id)?.status ?? 'new'
    if (status === 'mastered') mastered++
    else if (status === 'learning') learning++
  }
  const total = terms.length
  return {
    total,
    mastered,
    learning,
    remaining: total - mastered,
    percent: total === 0 ? 0 : Math.round((mastered / total) * 100),
  }
}
