import { beforeEach, describe, expect, it } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Write from './Write'
import { DEFINITION_OF, clearDb, renderAtSetRoute, seedSet, setSettings } from '../../test/helpers'
import { loadProgress } from '../../store/progress'

beforeEach(async () => {
  await clearDb()
  await seedSet()
})

const render = () => renderAtSetRoute(<Write />, 'write')

/** The round order is randomised, so read the prompt and look up its answer. */
async function currentAnswer(): Promise<string> {
  const prompt = (await screen.findByTestId('prompt')).textContent ?? ''
  const answer = DEFINITION_OF.get(prompt)
  expect(answer, `no definition for prompt "${prompt}"`).toBeTruthy()
  return answer!
}

const input = () => screen.getByLabelText(/your answer/i)

describe('Write', () => {
  it('asks for a written answer straight away', async () => {
    render()
    expect(await screen.findByText(/write the answer/i)).toBeInTheDocument()
    expect(input()).toBeInTheDocument()
  })

  it('accepts a correct answer and records it', async () => {
    const user = userEvent.setup()
    render()
    const answer = await currentAnswer()

    await user.type(input(), `${answer}{Enter}`)
    expect(await screen.findByText(/^correct$/i)).toBeInTheDocument()

    await waitFor(async () => {
      const rows = [...(await loadProgress('set-1')).values()]
      expect(rows.some((row) => row.correct === 1 && row.box === 1)).toBe(true)
    })
  })

  it('treats a near miss as a typo rather than a failure', async () => {
    const user = userEvent.setup()
    render()
    const answer = await currentAnswer()

    await user.type(input(), `${answer.slice(0, -1)}{Enter}`)
    expect(await screen.findByText(/watch your spelling/i)).toBeInTheDocument()
    await waitFor(async () => {
      const rows = [...(await loadProgress('set-1')).values()]
      expect(rows.some((row) => row.correct === 1)).toBe(true)
    })
  })

  it('makes you retype the answer after a miss before moving on', async () => {
    const user = userEvent.setup()
    render()
    const answer = await currentAnswer()

    await user.type(input(), 'nonsense{Enter}')
    expect(await screen.findByText(/correct answer/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^continue/i }))
    expect(await screen.findByText(/type the correct answer to continue/i)).toBeInTheDocument()

    // Still wrong: the question does not advance.
    await user.type(input(), 'still wrong{Enter}')
    expect(screen.getByText(/type the correct answer to continue/i)).toBeInTheDocument()

    await user.clear(input())
    await user.type(input(), `${answer}{Enter}`)
    expect(await screen.findByText(/^write the answer$/i)).toBeInTheDocument()
  })

  it('skips the retype step when the setting is off', async () => {
    await setSettings({ retypeOnMiss: false })
    const user = userEvent.setup()
    render()
    await currentAnswer()

    await user.type(input(), 'nonsense{Enter}')
    await user.click(await screen.findByRole('button', { name: /^continue/i }))
    expect(await screen.findByText(/2 of/i)).toBeInTheDocument()
  })

  it('lets a graded-wrong answer be overridden without losing a box', async () => {
    const user = userEvent.setup()
    await setSettings({ retypeOnMiss: false })
    render()
    await currentAnswer()

    await user.type(input(), 'nonsense{Enter}')
    await user.click(await screen.findByRole('button', { name: /i was right/i }))

    await waitFor(async () => {
      const rows = [...(await loadProgress('set-1')).values()]
      expect(rows.some((row) => row.box === 1 && row.incorrect === 0)).toBe(true)
    })
  })
})
