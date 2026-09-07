import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import SharedSet from './SharedSet'
import { clearDb } from '../test/helpers'
import { encodeSet } from '../lib/shareLink'
import { listSets } from '../store/sets'
import type { StudySet } from '../lib/types'

const sample: StudySet = {
  id: 's1',
  title: 'Shared Biology',
  description: 'From a friend',
  terms: [
    { id: 't1', term: 'mitochondria', definition: 'powerhouse of the cell', starred: true },
    { id: 't2', term: 'ribosome', definition: 'builds proteins', starred: false },
  ],
  termLang: 'en-US',
  defLang: 'en-US',
  createdAt: 1,
  updatedAt: 1,
}

function renderWithHash(hash: string) {
  window.location.hash = hash
  return render(
    <MemoryRouter initialEntries={['/shared']}>
      <Routes>
        <Route path="/shared" element={<SharedSet />} />
        <Route path="/set/:id" element={<h1>Set page</h1>} />
        <Route path="/home" element={<h1>Your sets</h1>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(async () => {
  await clearDb()
  window.location.hash = ''
})

describe('SharedSet', () => {
  it('previews the set from the link without saving it', async () => {
    renderWithHash(`#${await encodeSet(sample)}`)
    expect(await screen.findByRole('heading', { name: 'Shared Biology' })).toBeInTheDocument()
    expect(screen.getByText('mitochondria')).toBeInTheDocument()
    expect(screen.getByText(/2 terms/)).toBeInTheDocument()
    expect(await listSets()).toHaveLength(0)
  })

  it('adds the set only when asked, with ids of its own', async () => {
    const user = userEvent.setup()
    renderWithHash(`#${await encodeSet(sample)}`)
    await user.click(await screen.findByRole('button', { name: /add to my sets/i }))

    await waitFor(async () => {
      expect(await listSets()).toHaveLength(1)
    })
    const [saved] = await listSets()
    expect(saved.id).not.toBe('s1')
    expect(saved.title).toBe('Shared Biology')
    expect(saved.terms).toHaveLength(2)
    expect(await screen.findByRole('heading', { name: 'Set page' })).toBeInTheDocument()
  })

  it('explains a damaged link instead of failing silently', async () => {
    const fragment = await encodeSet(sample)
    renderWithHash(`#${fragment.slice(0, 20)}`)
    expect(await screen.findByText(/this link didn't work/i)).toBeInTheDocument()
    expect(await listSets()).toHaveLength(0)
  })

  it('explains an empty link', async () => {
    renderWithHash('')
    expect(await screen.findByText(/this link didn't work/i)).toBeInTheDocument()
  })
})
