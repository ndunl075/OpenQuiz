import { db } from '../lib/db'
import { applyAnswer, emptyProgress } from '../lib/scheduler'
import type { ModeStats, Progress, SetId, StudyMode, TermId } from '../lib/types'

export async function loadProgress(setId: SetId): Promise<Map<TermId, Progress>> {
  const rows = await db.progress.where('setId').equals(setId).toArray()
  return new Map(rows.map((row) => [row.termId, row]))
}

export async function recordAnswer(
  setId: SetId,
  termId: TermId,
  correct: boolean,
): Promise<Progress> {
  const existing = (await db.progress.get([setId, termId])) ?? emptyProgress(setId, termId)
  const next = applyAnswer(existing, correct)
  await db.progress.put(next)
  return next
}

/**
 * Replay an answer as correct from the state *before* it was graded, so
 * "I was right" erases the miss instead of stacking a promotion on top of
 * the demotion it just caused.
 */
export async function overrideAnswer(
  setId: SetId,
  termId: TermId,
  before: Progress | undefined,
): Promise<Progress> {
  const next = applyAnswer(before ?? emptyProgress(setId, termId), true)
  await db.progress.put(next)
  return next
}

export async function setKnown(setId: SetId, termId: TermId, known: boolean): Promise<Progress> {
  const existing = (await db.progress.get([setId, termId])) ?? emptyProgress(setId, termId)
  const next: Progress = { ...existing, known, lastSeen: Date.now() }
  await db.progress.put(next)
  return next
}

export async function resetProgress(setId: SetId): Promise<void> {
  await db.progress.where('setId').equals(setId).delete()
}

export async function loadModeStats(setId: SetId): Promise<Map<StudyMode, ModeStats>> {
  const rows = await db.modeStats.where('setId').equals(setId).toArray()
  return new Map(rows.map((row) => [row.mode, row]))
}

export async function recordModeStats(
  setId: SetId,
  mode: StudyMode,
  result: { ms?: number; score?: number },
): Promise<ModeStats> {
  const id = `${setId}:${mode}`
  const existing = await db.modeStats.get(id)
  const next: ModeStats = {
    id,
    setId,
    mode,
    plays: (existing?.plays ?? 0) + 1,
    lastPlayed: Date.now(),
    bestMs:
      result.ms === undefined
        ? existing?.bestMs
        : Math.min(result.ms, existing?.bestMs ?? Infinity),
    bestScore:
      result.score === undefined
        ? existing?.bestScore
        : Math.max(result.score, existing?.bestScore ?? -Infinity),
  }
  await db.modeStats.put(next)
  return next
}
