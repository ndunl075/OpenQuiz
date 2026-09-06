import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Stats from './Stats'
import { clearDb, seedSet } from '../test/helpers'
import { db } from '../lib/db'
import { recordModeStats } from '../store/progress'

beforeEach(async () => {
  await clearDb()
})

const renderPage = () =>
  render(
    <MemoryRouter>
      <Stats />
    </MemoryRouter>,
  )

async function master(termIds: string[], setId = 'set-1') {
  for (const termId of termIds) {
    await db.progress.put({
      setId,
      termId,
      box: 5,
      status: 'mastered',
      seen: 4,
      correct: 4,
      incorrect: 0,
      lastSeen: Date.now(),
    })
  }
}

describe('Stats', () => {
  it('invites you to start when there is nothing to report', async () => {
    expect(renderPage()).toBeTruthy()
    expect(await screen.findByText(/no progress yet/i)).toBeInTheDocument()
  })

  it('summarises mastery across the library', async () => {
    await seedSet()
    await master(['t1', 't2', 't3'])
    renderPage()

    expect(await screen.findByText('50%')).toBeInTheDocument()
    expect(screen.getByText('3/6 mastered')).toBeInTheDocument()
  })

  it('computes accuracy from recorded answers', async () => {
    await seedSet()
    await db.progress.put({
      setId: 'set-1',
      termId: 't1',
      box: 1,
      status: 'learning',
      seen: 4,
      correct: 3,
      incorrect: 1,
      lastSeen: 1,
    })
    renderPage()

    expect(await screen.findByText('75%')).toBeInTheDocument()
    expect(screen.getByText('4 answers')).toBeInTheDocument()
  })

  it('shows personal bests for the timed and graded modes', async () => {
    await seedSet()
    await master(['t1'])
    await recordModeStats('set-1', 'match', { ms: 9400 })
    await recordModeStats('set-1', 'test', { score: 88 })
    await recordModeStats('set-1', 'gravity', { score: 5300 })
    renderPage()

    expect(await screen.findByText(/best test 88%/i)).toBeInTheDocument()
    expect(screen.getByText(/best match 9\.4s/i)).toBeInTheDocument()
    expect(screen.getByText(/gravity high 5,300/i)).toBeInTheDocument()
  })
})
