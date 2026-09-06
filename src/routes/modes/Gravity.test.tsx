import { beforeEach, describe, expect, it } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Gravity from './Gravity'
import { DEFINITION_OF, clearDb, renderAtSetRoute, seedSet } from '../../test/helpers'
import { loadModeStats, loadProgress, recordModeStats } from '../../store/progress'

beforeEach(async () => {
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

    const answer = await fallingAnswer()
    await user.type(input(), `${answer}{Enter}`)

    await waitFor(() => {
      expect(screen.getByText(/^[1-9]\d*$/)).toBeInTheDocument()
    })
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

    expect(screen.getByTestId('falling-prompt').textContent).toBe(before)
    expect(screen.getByLabelText(/3 lives left/i)).toBeInTheDocument()
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

    for (let i = 0; i < 5; i++) {
      const answer = await fallingAnswer()
      await user.type(input(), `${answer}{Enter}`)
    }

    expect(await screen.findByText('Lv 2')).toBeInTheDocument()
  })

  it('shows an existing high score on the start screen', async () => {
    await recordModeStats('set-1', 'gravity', { score: 4200 })
    render()
    expect(await screen.findByText(/high score:/i)).toBeInTheDocument()
    expect(screen.getByText('4,200')).toBeInTheDocument()
  })

  it('records the score when the game ends', async () => {
    await recordModeStats('set-1', 'gravity', { score: 10 })
    expect((await loadModeStats('set-1')).get('gravity')?.bestScore).toBe(10)
  })
})
