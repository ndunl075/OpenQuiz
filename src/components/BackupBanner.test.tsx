import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BackupBanner } from './BackupBanner'
import { clearDb, seedSet, setSettings } from '../test/helpers'
import { getSettings } from '../lib/db'

const DAY = 24 * 60 * 60 * 1000

beforeEach(async () => {
  await clearDb()
  vi.restoreAllMocks()
  URL.createObjectURL = vi.fn(() => 'blob:test')
  URL.revokeObjectURL = vi.fn()
})

describe('BackupBanner', () => {
  it('says nothing to someone with no sets', async () => {
    render(<BackupBanner />)
    await waitFor(() => expect(screen.queryByRole('complementary')).not.toBeInTheDocument())
  })

  it('says nothing about a set made today', async () => {
    await seedSet({ createdAt: Date.now() })
    render(<BackupBanner />)
    await waitFor(() => expect(screen.queryByRole('complementary')).not.toBeInTheDocument())
  })

  it('asks once a library has gone a week without a backup', async () => {
    await seedSet({ createdAt: Date.now() - 9 * DAY })
    render(<BackupBanner />)
    expect(await screen.findByText(/your sets have no backup/i)).toBeInTheDocument()
    expect(screen.getByText(/never backed up/i)).toBeInTheDocument()
  })

  it('backs up and records when it happened, then stops asking', async () => {
    const user = userEvent.setup()
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    await seedSet({ createdAt: Date.now() - 9 * DAY })
    render(<BackupBanner />)

    await user.click(await screen.findByRole('button', { name: /back up now/i }))
    await waitFor(() => expect(click).toHaveBeenCalled())
    await waitFor(async () => {
      expect((await getSettings()).lastBackupAt).toBeGreaterThan(0)
    })
    await waitFor(() =>
      expect(screen.queryByText(/your sets have no backup/i)).not.toBeInTheDocument(),
    )
  })

  it('can be dismissed for the session', async () => {
    const user = userEvent.setup()
    await seedSet({ createdAt: Date.now() - 9 * DAY })
    render(<BackupBanner />)
    await user.click(await screen.findByRole('button', { name: /not now/i }))
    expect(screen.queryByText(/your sets have no backup/i)).not.toBeInTheDocument()
  })

  it('stays quiet when reminders are turned off', async () => {
    await setSettings({ backupReminderDays: 0 })
    await seedSet({ createdAt: Date.now() - 90 * DAY })
    render(<BackupBanner />)
    await waitFor(() => expect(screen.queryByRole('complementary')).not.toBeInTheDocument())
  })

  it('stays quiet for a week after a backup', async () => {
    await setSettings({ lastBackupAt: Date.now() - DAY })
    await seedSet({ createdAt: Date.now() - 400 * DAY })
    render(<BackupBanner />)
    await waitFor(() => expect(screen.queryByRole('complementary')).not.toBeInTheDocument())
  })
})
