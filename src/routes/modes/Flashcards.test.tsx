import { beforeEach, describe, expect, it } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Flashcards from './Flashcards'
import { clearDb, renderAtSetRoute, seedSet } from '../../test/helpers'
import { loadProgress } from '../../store/progress'

beforeEach(async () => {
  await clearDb()
  await seedSet()
})

const render = () => renderAtSetRoute(<Flashcards />, 'flashcards')

describe('Flashcards', () => {
  it('shows the first term and its position in the deck', async () => {
    render()
    expect(await screen.findByText('mitochondria')).toBeInTheDocument()
    expect(screen.getByText('1 / 6')).toBeInTheDocument()
  })

  it('reveals the definition when the card is clicked', async () => {
    const user = userEvent.setup()
    render()
    const card = await screen.findByRole('button', { name: /show definition/i })
    expect(screen.getByText('powerhouse of the cell')).toBeInTheDocument()
    await user.click(card)
    expect(await screen.findByRole('button', { name: /show term/i })).toBeInTheDocument()
  })

  it('advances and goes back through the deck', async () => {
    const user = userEvent.setup()
    render()
    await screen.findByText('mitochondria')

    await user.click(screen.getByRole('button', { name: /next card/i }))
    expect(await screen.findByText('ribosome')).toBeInTheDocument()
    expect(screen.getByText('2 / 6')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /previous card/i }))
    expect(await screen.findByText('mitochondria')).toBeInTheDocument()
  })

  it('cannot go back past the first card', async () => {
    render()
    await screen.findByText('mitochondria')
    expect(screen.getByRole('button', { name: /previous card/i })).toBeDisabled()
  })

  it('persists Know / Still learning verdicts to progress', async () => {
    const user = userEvent.setup()
    render()
    await screen.findByText('mitochondria')

    await user.click(screen.getByRole('button', { name: /sort by know/i }))
    await user.click(await screen.findByRole('button', { name: /know it/i }))

    await waitFor(async () => {
      expect((await loadProgress('set-1')).get('t1')?.known).toBe(true)
    })
    expect(await screen.findByText('1 know')).toBeInTheDocument()
  })

  it('offers a review of only the missed cards at the end', async () => {
    const user = userEvent.setup()
    await clearDb()
    await seedSet({ terms: [
      { id: 't1', term: 'alpha', definition: 'first', starred: false },
      { id: 't2', term: 'beta', definition: 'second', starred: false },
    ] })
    render()
    await screen.findByText('alpha')

    await user.click(screen.getByRole('button', { name: /sort by know/i }))
    await user.click(await screen.findByRole('button', { name: /still learning/i }))
    await user.click(await screen.findByRole('button', { name: /know it/i }))

    expect(await screen.findByText(/you finished the deck/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /review the 1 you missed/i }))

    expect(await screen.findByText('alpha')).toBeInTheDocument()
    expect(screen.getByText('1 / 1')).toBeInTheDocument()
  })

  it('sends an unknown set to the not-found page', async () => {
    renderAtSetRoute(<Flashcards />, 'flashcards', 'missing')
    expect(await screen.findByText('404')).toBeInTheDocument()
  })
})
