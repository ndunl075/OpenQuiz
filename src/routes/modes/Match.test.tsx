import { beforeEach, describe, expect, it } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Match from './Match'
import { SAMPLE_PAIRS, clearDb, renderAtSetRoute, seedSet } from '../../test/helpers'
import { loadModeStats, recordModeStats } from '../../store/progress'

beforeEach(async () => {
  await clearDb()
  await seedSet()
})

const render = () => renderAtSetRoute(<Match />, 'match')

const startGame = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(await screen.findByRole('button', { name: /start game/i }))
}

/** Clicks every term/definition pair currently on the board. */
async function clearBoard(user: ReturnType<typeof userEvent.setup>) {
  for (const [term, definition] of SAMPLE_PAIRS) {
    const tile = screen.queryByRole('button', { name: term })
    if (!tile) continue
    await user.click(tile)
    await user.click(screen.getByRole('button', { name: definition }))
  }
}

describe('Match', () => {
  it('opens on a start screen and shows how many pairs are in play', async () => {
    render()
    expect(await screen.findByRole('button', { name: /start game/i })).toBeInTheDocument()
    expect(screen.getByText(/6 pairs from this set/i)).toBeInTheDocument()
  })

  it('shows a tile for both sides of every pair', async () => {
    const user = userEvent.setup()
    render()
    await startGame(user)
    expect(await screen.findByText(/12 tiles left/i)).toBeInTheDocument()
  })

  it('clears a matched pair from the board', async () => {
    const user = userEvent.setup()
    render()
    await startGame(user)
    await screen.findByText(/12 tiles left/i)

    const [term, definition] = SAMPLE_PAIRS[0]
    await user.click(screen.getByRole('button', { name: term }))
    await user.click(screen.getByRole('button', { name: definition }))

    expect(await screen.findByText(/10 tiles left/i)).toBeInTheDocument()
  })

  it('does not clear a mismatched pair', async () => {
    const user = userEvent.setup()
    render()
    await startGame(user)
    await screen.findByText(/12 tiles left/i)

    await user.click(screen.getByRole('button', { name: SAMPLE_PAIRS[0][0] }))
    await user.click(screen.getByRole('button', { name: SAMPLE_PAIRS[1][1] }))

    expect(screen.getByText(/12 tiles left/i)).toBeInTheDocument()
  })

  it('deselects a tile when it is clicked twice', async () => {
    const user = userEvent.setup()
    render()
    await startGame(user)
    await screen.findByText(/12 tiles left/i)

    const tile = screen.getByRole('button', { name: SAMPLE_PAIRS[0][0] })
    await user.click(tile)
    await user.click(tile)
    // Now pairing with a different definition must still be a mismatch, not a
    // match against the stale selection.
    await user.click(screen.getByRole('button', { name: SAMPLE_PAIRS[1][1] }))
    expect(screen.getByText(/12 tiles left/i)).toBeInTheDocument()
  })

  it('finishes when the board is clear and records a time', async () => {
    const user = userEvent.setup()
    render()
    await startGame(user)
    await screen.findByText(/12 tiles left/i)
    await clearBoard(user)

    expect(await screen.findByText(/new personal best/i)).toBeInTheDocument()
    await waitFor(async () => {
      expect((await loadModeStats('set-1')).get('match')?.bestMs).toBeGreaterThan(0)
    })
  })

  it('shows an existing best time on the start screen', async () => {
    await recordModeStats('set-1', 'match', { ms: 12300 })
    render()
    expect(await screen.findByText(/your best:/i)).toBeInTheDocument()
  })
})
