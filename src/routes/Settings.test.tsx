import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import SettingsPage from './Settings'
import { clearDb, seedSet } from '../test/helpers'
import { db, getSettings } from '../lib/db'
import { toExport } from '../lib/exportSet'
import { useSettings } from '../store/useSettings'

beforeEach(async () => {
  await clearDb()
  useSettings.setState({ loaded: true })
})

const renderPage = () =>
  render(
    <MemoryRouter>
      <SettingsPage />
    </MemoryRouter>,
  )

describe('Settings', () => {
  it('persists a settings change to the database', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('switch', { name: /forgive typos/i }))
    await waitFor(async () => {
      expect((await getSettings()).typoTolerance).toBe(false)
    })
  })

  it('switches the theme and applies it to the document', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('tab', { name: 'Dark' }))
    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe('dark')
    })
  })

  it('imports a set from a backup file', async () => {
    const user = userEvent.setup()
    const set = await seedSet()
    const file = new File([JSON.stringify(toExport(set))], 'set.json', {
      type: 'application/json',
    })
    renderPage()

    await user.upload(screen.getByLabelText(/backup file/i), file)
    expect(await screen.findByText(/imported 1 set/i)).toBeInTheDocument()
    await waitFor(async () => {
      expect(await db.sets.count()).toBe(2)
    })
  })

  it('reports a helpful error for a file that is not an export', async () => {
    const user = userEvent.setup()
    const file = new File([JSON.stringify({ nope: true })], 'other.json', {
      type: 'application/json',
    })
    renderPage()

    await user.upload(screen.getByLabelText(/backup file/i), file)
    expect(
      await screen.findByText(/does not look like an openquiz export/i),
    ).toBeInTheDocument()
  })

  it('requires confirmation before deleting everything', async () => {
    const user = userEvent.setup()
    await seedSet()
    renderPage()

    await user.click(screen.getByRole('button', { name: /delete all data/i }))
    expect(await screen.findByText(/delete all data\?/i)).toBeInTheDocument()
    expect(await db.sets.count()).toBe(1)

    await user.click(screen.getByRole('button', { name: /cancel/i }))
    expect(await db.sets.count()).toBe(1)

    await user.click(screen.getByRole('button', { name: /delete all data/i }))
    await user.click(await screen.findByRole('button', { name: /delete everything/i }))
    await waitFor(async () => {
      expect(await db.sets.count()).toBe(0)
    })
  })

  it('exports the library as a downloadable file', async () => {
    const user = userEvent.setup()
    await seedSet()
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    URL.createObjectURL = vi.fn(() => 'blob:test')
    URL.revokeObjectURL = vi.fn()

    renderPage()
    await user.click(screen.getByRole('button', { name: /^export$/i }))
    await waitFor(() => {
      expect(click).toHaveBeenCalled()
    })
    click.mockRestore()
  })
})
