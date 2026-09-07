import type { Settings } from './types'

export interface ReminderState {
  /** Whether a nudge should be shown right now. */
  due: boolean
  /** Whole days since the last backup, or null if there has never been one. */
  daysSince: number | null
}

const DAY = 24 * 60 * 60 * 1000

/**
 * Decides whether to nudge for a backup.
 *
 * Nothing is worth backing up before the first set exists, and a user who has
 * turned reminders off is never asked. A library that has never been backed up
 * is only nudged once it has had time to matter — the same interval as any
 * other reminder — so making a first set does not immediately produce a chore.
 */
export function backupReminder(
  settings: Pick<Settings, 'lastBackupAt' | 'backupReminderDays'>,
  { setCount, oldestSetAt, now = Date.now() }: { setCount: number; oldestSetAt: number; now?: number },
): ReminderState {
  const daysSince =
    settings.lastBackupAt > 0 ? Math.floor((now - settings.lastBackupAt) / DAY) : null

  if (setCount === 0 || settings.backupReminderDays <= 0) return { due: false, daysSince }

  const since = settings.lastBackupAt > 0 ? settings.lastBackupAt : oldestSetAt
  if (since <= 0) return { due: false, daysSince }

  return { due: now - since >= settings.backupReminderDays * DAY, daysSince }
}

/** Whole days since a backup, or null if there has never been one. */
export function daysSinceBackup(lastBackupAt: number, now: number): number | null {
  return lastBackupAt > 0 ? Math.floor((now - lastBackupAt) / DAY) : null
}

export function describeLastBackup(daysSince: number | null): string {
  if (daysSince === null) return 'never backed up'
  if (daysSince === 0) return 'backed up today'
  if (daysSince === 1) return 'backed up yesterday'
  return `backed up ${daysSince} days ago`
}
