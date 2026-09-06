import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DEFINITION_OF, clearDb, renderAtSetRoute, seedSet } from '../../test/helpers'
import { loadModeStats, loadProgress, recordModeStats } from '../../store/progress'

/**
 * The fall is a real interval, so with the shipped timings a term can reach the
 * ground mid-keystroke and the test would answer a different prompt. Faking the
 * timer instead stalls the animation library, so the fall duration is mocked:
 * effectively frozen by default, and made instant by the tests that want a miss.
 *
 * The timing maths itself is covered directly in `lib/gravity.test.ts`.
 */
const FROZEN_FALL_MS = 10 * 60 * 1000
const fallDurationMs = vi.hoisted(() => vi.fn(() => 10 * 60 * 1000))

vi.mock('../../lib/gravity', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/gravity')>()),
  fallDurationMs,
}))

const { default: Gravity } = await import('./Gravity')

beforeEach(async () => {
  fallDurationMs.mockReturnValue(FROZEN_FALL_MS)
  await clearDb()
  await seedSet()
})

const render = () => renderAtSetRoute(<Gravity />, 'gravity')

const startGame = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(await screen.findByRole('button', { name: /start game/i }))
}

/** The definition of whichever term is currently falling. */
async function fallingAnswer(): Promise<string> {
  const prompt = (await screen.findByTestId('falling-prompt')).textContent ?? ''
  const answer = DEFINITION_OF.get(prompt)
  expect(answer, `no definition for falling term "${prompt}"`).toBeTruthy()
  return answer!
}

const input = () => screen.getByLabelText(/type the answer/i)

/** Reads the current prompt, answers it, and waits for the next term. */
async function answerCurrent(user: ReturnType<typeof userEvent.setup>) {
  const answer = await fallingAnswer()
  await user.type(input(), `${answer}{Enter}`)
  await waitFor(() => expect(input()).toHaveValue(''))
}

describe('Gravity', () => {
  it('opens on a start screen with a difficulty picker', async () => {
    render()
    expect(await screen.findByRole('button', { name: /start game/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Normal' })).toBeInTheDocument()
  })

  it('drops a term and scores a correct answer', async () => {
    const user = userEvent.setup()
    render()
    await startGame(user)
    await answerCurrent(user)

    expect(screen.getByText('100')).toBeInTheDocument()
    await waitFor(async () => {
      const rows = [...(await loadProgress('set-1')).values()]
      expect(rows.some((row) => row.correct === 1)).toBe(true)
    })
  })

  it('ignores a wrong answer instead of ending the turn', async () => {
    const user = userEvent.setup()
    render()
    await startGame(user)

    const before = (await screen.findByTestId('falling-prompt')).textContent
    await user.type(input(), 'definitely not it{Enter}')

    expect(screen.getByTestId('falling-prompt')).toHaveTextContent(before!)
    expect(screen.getByLabelText(/3 lives left/i)).toBeInTheDocument()
    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('accepts a typo, matching the shared grading rules', async () => {
    const user = userEvent.setup()
    render()
    await startGame(user)

    const answer = await fallingAnswer()
    await user.type(input(), `${answer.slice(0, -1)}{Enter}`)

    await waitFor(async () => {
      const rows = [...(await loadProgress('set-1')).values()]
      expect(rows.some((row) => row.correct === 1)).toBe(true)
    })
  })

  it('speeds up a level every five answers', async () => {
    const user = userEvent.setup()
    render()
    await startGame(user)

    for (let i = 0; i < 5; i++) await answerCurrent(user)

    expect(await screen.findByText('Lv 2')).toBeInTheDocument()
  })

  it('costs a life when a term reaches the ground', async () => {
    const user = userEvent.setup()
    fallDurationMs.mockReturnValue(60)
    render()
    await startGame(user)

    expect(await screen.findByLabelText(/2 lives left/i)).toBeInTheDocument()
  })

  it('ends the game after three misses and records the score', async () => {
    const user = userEvent.setup()
    fallDurationMs.mockReturnValue(60)
    render()
    await startGame(user)

    expect(await screen.findByText(/game over|new high score/i)).toBeInTheDocument()
    await waitFor(async () => {
      expect((await loadModeStats('set-1')).get('gravity')?.plays).toBe(1)
    })
  })

  it('shows an existing high score on the start screen', async () => {
    await recordModeStats('set-1', 'gravity', { score: 4200 })
    render()
    expect(await screen.findByText(/high score:/i)).toBeInTheDocument()
    expect(screen.getByText('4,200')).toBeInTheDocument()
  })
})
