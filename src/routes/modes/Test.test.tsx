import { beforeEach, describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Test from './Test'
import { DEFINITION_OF, clearDb, renderAtSetRoute, seedSet } from '../../test/helpers'
import { loadModeStats } from '../../store/progress'

beforeEach(async () => {
  await clearDb()
  await seedSet()
})

const render = () => renderAtSetRoute(<Test />, 'test')

/** Turn off every question type except the named one. */
async function onlyType(user: ReturnType<typeof userEvent.setup>, keep: string) {
  for (const label of ['Written', 'Multiple choice', 'True / false', 'Matching']) {
    const toggle = screen.getByRole('switch', { name: label })
    const on = toggle.getAttribute('aria-checked') === 'true'
    if (on !== (label === keep)) await user.click(toggle)
  }
}

async function setCount(user: ReturnType<typeof userEvent.setup>, count: number) {
  const field = screen.getByLabelText(/question count/i)
  await user.clear(field)
  await user.type(field, String(count))
}

describe('Test', () => {
  it('opens on a configuration screen, not a test', async () => {
    render()
    expect(await screen.findByText(/set up your test/i)).toBeInTheDocument()
    expect(screen.getByText(/6 available in this set/i)).toBeInTheDocument()
  })

  it('refuses to start with no question types selected', async () => {
    const user = userEvent.setup()
    render()
    await screen.findByText(/set up your test/i)

    for (const label of ['Written', 'Multiple choice', 'True / false']) {
      await user.click(screen.getByRole('switch', { name: label }))
    }
    expect(screen.getByText(/pick at least one question type/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /start test/i })).toBeDisabled()
  })

  it('generates the requested number of questions', async () => {
    const user = userEvent.setup()
    render()
    await screen.findByText(/set up your test/i)
    await onlyType(user, 'Written')
    await setCount(user, 3)
    await user.click(screen.getByRole('button', { name: /start test/i }))

    expect(await screen.findByText('Question 1')).toBeInTheDocument()
    expect(screen.getByText('Question 3')).toBeInTheDocument()
    expect(screen.queryByText('Question 4')).not.toBeInTheDocument()
    expect(screen.getByText(/0 of 3 answered/i)).toBeInTheDocument()
  })

  it('grades a fully correct written test at 100% and records the score', async () => {
    const user = userEvent.setup()
    render()
    await screen.findByText(/set up your test/i)
    await onlyType(user, 'Written')
    await setCount(user, 3)
    await user.click(screen.getByRole('button', { name: /start test/i }))

    const cards = await screen.findAllByRole('group')
    for (const [i, card] of cards.entries()) {
      const prompt = within(card).getByText(/^[a-z]+$/i).textContent ?? ''
      await user.type(
        within(card).getByLabelText(`Answer for question ${i + 1}`),
        DEFINITION_OF.get(prompt)!,
      )
    }

    await user.click(screen.getByRole('button', { name: /submit test/i }))
    expect(await screen.findByText('100%')).toBeInTheDocument()
    expect(await loadModeStats('set-1')).toBeTruthy()
    expect((await loadModeStats('set-1')).get('test')?.bestScore).toBe(100)
  })

  it('marks wrong answers and shows the expected answer in the review', async () => {
    const user = userEvent.setup()
    render()
    await screen.findByText(/set up your test/i)
    await onlyType(user, 'Written')
    await setCount(user, 2)
    await user.click(screen.getByRole('button', { name: /start test/i }))

    await user.type(await screen.findByLabelText('Answer for question 1'), 'definitely wrong')
    await user.type(screen.getByLabelText('Answer for question 2'), 'also wrong')
    await user.click(screen.getByRole('button', { name: /submit test/i }))

    expect(await screen.findByText('0%')).toBeInTheDocument()
    expect(screen.getAllByText(/^correct:$/i).length).toBeGreaterThan(0)
  })

  it('counts an unanswered question as wrong rather than skipping it', async () => {
    const user = userEvent.setup()
    render()
    await screen.findByText(/set up your test/i)
    await onlyType(user, 'Written')
    await setCount(user, 2)
    await user.click(screen.getByRole('button', { name: /start test/i }))
    await screen.findByText('Question 1')

    await user.click(screen.getByRole('button', { name: /submit test/i }))
    expect(await screen.findByText('0%')).toBeInTheDocument()
    expect(screen.getAllByText('no answer').length).toBe(2)
  })

  it('offers a fresh test from the results screen', async () => {
    const user = userEvent.setup()
    render()
    await screen.findByText(/set up your test/i)
    await onlyType(user, 'Written')
    await setCount(user, 1)
    await user.click(screen.getByRole('button', { name: /start test/i }))
    await screen.findByText('Question 1')
    await user.click(screen.getByRole('button', { name: /submit test/i }))

    await user.click(await screen.findByRole('button', { name: /take a new test/i }))
    expect(await screen.findByText(/set up your test/i)).toBeInTheDocument()
  })
})
