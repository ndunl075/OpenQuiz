import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import LandingGate from './LandingGate'
import { clearDb, seedSet } from '../test/helpers'

beforeEach(async () => {
  await clearDb()
})

const renderGate = () =>
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<LandingGate />} />
        <Route path="/home" element={<h1>Your sets</h1>} />
      </Routes>
    </MemoryRouter>,
  )

describe('LandingGate', () => {
  it('shows the pitch to someone with no sets on this device', async () => {
    renderGate()
    // The hero and the closing section both carry the call to action.
    const calls = await screen.findAllByRole('link', { name: 'Try OpenQuiz' })
    expect(calls.length).toBeGreaterThan(0)
    for (const call of calls) expect(call).toHaveAttribute('href', '/home')
  })

  it('sends a returning visitor straight to their sets', async () => {
    await seedSet()
    renderGate()
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Your sets' })).toBeInTheDocument()
    })
    expect(screen.queryAllByRole('link', { name: 'Try OpenQuiz' })).toHaveLength(0)
  })
})
