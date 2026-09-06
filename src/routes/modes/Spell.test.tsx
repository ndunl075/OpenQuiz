import { beforeEach, describe, expect, it } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Spell from './Spell'
import { TERM_OF, clearDb, renderAtSetRoute, seedSet } from '../../test/helpers'
import { loadProgress } from '../../store/progress'

beforeEach(async () => {
  await clearDb()
  await seedSet()
})

const render = () => renderAtSetRoute(<Spell />, 'spell')

/** Awaited: the field unmounts during the exit animation between questions. */
const input = () => screen.findByLabelText(/type what you hear/i)

/** Spell shuffles, so derive the spoken term from the definition hint. */
async function currentTerm(): Promise<string> {
  const hint = (await screen.findByTestId('spell-hint')).textContent ?? ''
  const term = TERM_OF.get(hint)
  expect(term, `no term for hint "${hint}"`).toBeTruthy()
  return term!
}

describe('Spell', () => {
  it('prompts for the spelling with a replayable audio button', async () => {
    render()
    expect(await screen.findByText(/spell what you hear/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /play the audio again/i })).toBeInTheDocument()
  })

  it('accepts the right spelling, records it and advances', async () => {
    const user = userEvent.setup()
    render()
    const term = await currentTerm()

    await user.type(await input(), `${term}{Enter}`)
    await waitFor(async () => {
      const rows = [...(await loadProgress('set-1')).values()]
      expect(rows.some((row) => row.correct === 1)).toBe(true)
    })
    // The correct-answer pause is deliberate, so allow for it.
    expect(await screen.findByText(/2 of 6/i, {}, { timeout: 3000 })).toBeInTheDocument()
  })

  it('does not forgive a typo, and shows the correct spelling', async () => {
    const user = userEvent.setup()
    render()
    const term = await currentTerm()

    await user.type(await input(), `${term.slice(0, -1)}{Enter}`)
    expect(await screen.findByText(/the correct spelling is/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^continue/i })).toBeInTheDocument()
  })

  it('offers a practice round of only the missed words at the end', async () => {
    const user = userEvent.setup()
    await clearDb()
    await seedSet({
      terms: [
        { id: 't1', term: 'alpha', definition: 'first', starred: false },
        { id: 't2', term: 'beta', definition: 'second', starred: false },
      ],
    })
    render()
    await screen.findByText(/spell what you hear/i)

    for (let i = 0; i < 2; i++) {
      await user.type(await input(), 'zzz{Enter}')
      await user.click(await screen.findByRole('button', { name: /^continue/i }))
    }

    expect(await screen.findByText(/round finished/i)).toBeInTheDocument()
    expect(screen.getByText(/0 of 2 spelled correctly/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /practise the 2 you missed/i }))
    expect(await screen.findByText(/1 of 2/i, {}, { timeout: 3000 })).toBeInTheDocument()
  })
})
