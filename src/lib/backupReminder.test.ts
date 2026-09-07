import { describe, expect, it } from 'vitest'
import { backupReminder, daysSinceBackup, describeLastBackup } from './backupReminder'

const DAY = 24 * 60 * 60 * 1000
const NOW = 1_800_000_000_000
const settings = (patch: Partial<{ lastBackupAt: number; backupReminderDays: number }> = {}) => ({
  lastBackupAt: 0,
  backupReminderDays: 7,
  ...patch,
})

describe('backupReminder', () => {
  it('says nothing when there are no sets to lose', () => {
    expect(
      backupReminder(settings(), { setCount: 0, oldestSetAt: NOW - 30 * DAY, now: NOW }).due,
    ).toBe(false)
  })

  it('does not nag the moment a first set is made', () => {
    expect(
      backupReminder(settings(), { setCount: 1, oldestSetAt: NOW - DAY, now: NOW }).due,
    ).toBe(false)
  })

  it('asks once a never-backed-up library has been around a while', () => {
    expect(
      backupReminder(settings(), { setCount: 1, oldestSetAt: NOW - 8 * DAY, now: NOW }).due,
    ).toBe(true)
  })

  it('asks again once the interval passes since the last backup', () => {
    const stale = settings({ lastBackupAt: NOW - 10 * DAY })
    expect(backupReminder(stale, { setCount: 3, oldestSetAt: NOW - 40 * DAY, now: NOW }).due).toBe(
      true,
    )
  })

  it('stays quiet just after a backup, however old the sets are', () => {
    const fresh = settings({ lastBackupAt: NOW - DAY })
    expect(backupReminder(fresh, { setCount: 3, oldestSetAt: NOW - 400 * DAY, now: NOW }).due).toBe(
      false,
    )
  })

  it('respects a custom interval, and zero turns reminders off', () => {
    const base = { setCount: 1, oldestSetAt: NOW - 3 * DAY, now: NOW }
    expect(backupReminder(settings({ backupReminderDays: 2 }), base).due).toBe(true)
    expect(backupReminder(settings({ backupReminderDays: 30 }), base).due).toBe(false)
    expect(backupReminder(settings({ backupReminderDays: 0 }), base).due).toBe(false)
  })

  it('reports how long it has been', () => {
    const state = backupReminder(settings({ lastBackupAt: NOW - 5 * DAY }), {
      setCount: 1,
      oldestSetAt: NOW - 5 * DAY,
      now: NOW,
    })
    expect(state.daysSince).toBe(5)
    expect(backupReminder(settings(), { setCount: 1, oldestSetAt: NOW, now: NOW }).daysSince).toBe(
      null,
    )
  })
})

describe('daysSinceBackup', () => {
  it('counts whole days, and reports null when there has never been one', () => {
    expect(daysSinceBackup(NOW - 3 * DAY, NOW)).toBe(3)
    expect(daysSinceBackup(NOW - 90 * 60 * 1000, NOW)).toBe(0)
    expect(daysSinceBackup(0, NOW)).toBe(null)
  })
})

describe('describeLastBackup', () => {
  it('reads naturally', () => {
    expect(describeLastBackup(null)).toBe('never backed up')
    expect(describeLastBackup(0)).toBe('backed up today')
    expect(describeLastBackup(1)).toBe('backed up yesterday')
    expect(describeLastBackup(9)).toBe('backed up 9 days ago')
  })
})
