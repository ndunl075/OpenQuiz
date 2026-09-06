import { beforeEach, describe, expect, it } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Learn from './Learn'
import { clearDb, renderAtSetRoute, seedSet } from '../../test/helpers'
import { loadProgress } from '../../store/progress'
import { db } from '../../lib/db'
import type { TermId } from '../../lib/types'

beforeEach(async () => {
  await clearDb()
  await seedSet()
})

const render = () => renderAtSetRoute(<Learn />, 'learn')

async function setBox(termId: TermId, box: number) {
  await db.progress.put({
    setId: 'set-1',
    termId,
    box,
    status: box >= 4 ? 'mastered' : box > 0 ? 'learning' : 'new',
    seen: box,
    correct: box,
    incorrect: 0,
    lastSeen: Date.now(),
  })
}

const ALL_TERMS: TermId[] = ['t1', 't2', 't3', 't4', 't5', 't6']

/** The numbered multiple-choice options, in display order. */
const options = () =>
  screen.getAllByRole('button').filter((el) => /^[1-4]\S/.test(el.textContent ?? ''))

describe('Learn', () => {
  it('starts with multiple choice for unseen terms', async () => {
    render()
    expect(await screen.findByText(/choose the answer/i)).toBeInTheDocument()
    expect(screen.getByText(/1 of/i)).toBeInTheDocument()
    expect(options()).toHaveLength(4)
  })

  it('promotes a term to written recall once it leaves the low boxes', async () => {
    // Everything else mastered, so the round can only serve t1.
    await Promise.all(ALL_TERMS.slice(1).map((id) => setBox(id, 5)))
    await setBox('t1', 2)

    render()
    expect(await screen.findByText(/write the answer/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/your answer/i)).toBeInTheDocument()
  })

  it('grades a written answer and accepts a typo', async () => {
    const user = userEvent.setup()
    await Promise.all(ALL_TERMS.slice(1).map((id) => setBox(id, 5)))
    await setBox('t1', 2)

    render()
    await screen.findByText(/write the answer/i)
    await user.type(screen.getByLabelText(/your answer/i), 'powerhouse of the cel{Enter}')

    expect(await screen.findByText(/watch your spelling/i)).toBeInTheDocument()
    await waitFor(async () => {
      expect((await loadProgress('set-1')).get('t1')?.box).toBe(3)
    })
  })

  it('lets a wrong written answer be overridden as correct', async () => {
    const user = userEvent.setup()
    await Promise.all(ALL_TERMS.slice(1).map((id) => setBox(id, 5)))
    await setBox('t1', 2)

    render()
    await screen.findByText(/write the answer/i)
    await user.type(screen.getByLabelText(/your answer/i), 'the cell battery{Enter}')
    expect(await screen.findByText(/correct answer/i)).toBeInTheDocument()

    await waitFor(async () => {
      expect((await loadProgress('set-1')).get('t1')?.box).toBe(0)
    })

    // The override erases the miss rather than promoting from the demoted box.
    await user.click(screen.getByRole('button', { name: /i was right/i }))
    await waitFor(async () => {
      const row = (await loadProgress('set-1')).get('t1')
      expect(row?.box).toBe(3)
      expect(row?.incorrect).toBe(0)
    })
  })

  it('reveals the answer after a multiple-choice pick and records it', async () => {
    const user = userEvent.setup()
    render()
    await screen.findByText(/choose the answer/i)

    await user.click(options()[0])
    expect(await screen.findByRole('button', { name: /continue/i })).toBeInTheDocument()
    await waitFor(async () => {
      expect((await loadProgress('set-1')).size).toBe(1)
    })
  })

  it('advances to the next question on continue', async () => {
    const user = userEvent.setup()
    render()
    await screen.findByText(/1 of/i)

    await user.click(options()[0])
    await user.click(await screen.findByRole('button', { name: /continue/i }))
    expect(await screen.findByText(/2 of/i)).toBeInTheDocument()
  })

  it('shows the mastered screen when nothing is left to learn', async () => {
    await Promise.all(ALL_TERMS.map((id) => setBox(id, 5)))
    render()
    expect(await screen.findByText(/you've mastered this set/i)).toBeInTheDocument()
  })

  it('refuses to run on a set with fewer than four terms', async () => {
    await clearDb()
    await seedSet({
      terms: [
        { id: 't1', term: 'a', definition: 'one', starred: false },
        { id: 't2', term: 'b', definition: 'two', starred: false },
      ],
    })
    render()
    expect(await screen.findByText(/needs at least 4 terms/i)).toBeInTheDocument()
  })
})
