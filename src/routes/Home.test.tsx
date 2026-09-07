import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Home from './Home'
import { clearDb, seedSet } from '../test/helpers'

beforeEach(async () => {
  await clearDb()
})

const renderHome = () =>
  render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>,
  )

describe('Home', () => {
  it('invites a first set when the device is empty', async () => {
    renderHome()
    expect(await screen.findByText(/nothing to study yet/i)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Your sets' })).toBeInTheDocument()
  })

  it('lists recent sets with a term count once there are any', async () => {
    await seedSet()
    renderHome()
    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument()
    expect(screen.getByText(/1 set · 6 terms on this device/i)).toBeInTheDocument()
    expect(screen.getByText('Cell Biology')).toBeInTheDocument()
  })
})
