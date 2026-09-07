import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InstallBanner } from './InstallBanner'
import { clearDb, setSettings } from '../test/helpers'
import { getSettings } from '../lib/db'

/** Stands in for the Chromium event that lets a site offer installation. */
function fireBeforeInstallPrompt(userChoice: 'accepted' | 'dismissed' = 'accepted') {
  const prompt = vi.fn(async () => {})
  const event = Object.assign(new Event('beforeinstallprompt'), {
    prompt,
    userChoice: Promise.resolve({ outcome: userChoice }),
  })
  window.dispatchEvent(event)
  return prompt
}

beforeEach(async () => {
  await clearDb()
  vi.restoreAllMocks()
})

describe('InstallBanner', () => {
  it('stays hidden until there is something to lose', () => {
    render(<InstallBanner hasSets={false} />)
    fireBeforeInstallPrompt()
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
  })

  it('offers installation once the browser says it can', async () => {
    const { rerender } = render(<InstallBanner hasSets />)
    fireBeforeInstallPrompt()
    rerender(<InstallBanner hasSets />)
    expect(await screen.findByText(/install openquiz on this device/i)).toBeInTheDocument()
  })

  it('triggers the browser prompt and then stops asking', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<InstallBanner hasSets />)
    const prompt = fireBeforeInstallPrompt('accepted')
    rerender(<InstallBanner hasSets />)

    await user.click(await screen.findByRole('button', { name: 'Install' }))
    expect(prompt).toHaveBeenCalled()
    await waitFor(async () => {
      expect((await getSettings()).installBannerDismissed).toBe(true)
    })
  })

  it('explains the Home Screen route on iOS, where there is no prompt API', async () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)')
    render(<InstallBanner hasSets />)
    expect(await screen.findByText(/add openquiz to your home screen/i)).toBeInTheDocument()
    expect(screen.getByText(/seven days/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Install' })).not.toBeInTheDocument()
  })

  it('stays dismissed once dismissed', async () => {
    const user = userEvent.setup()
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (iPhone)')
    render(<InstallBanner hasSets />)
    await user.click(await screen.findByRole('button', { name: 'Dismiss' }))
    await waitFor(async () => {
      expect((await getSettings()).installBannerDismissed).toBe(true)
    })
    expect(screen.queryByText(/add openquiz to your home screen/i)).not.toBeInTheDocument()
  })

  it('does not reappear for a user who already dismissed it', async () => {
    await setSettings({ installBannerDismissed: true })
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (iPhone)')
    render(<InstallBanner hasSets />)
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
  })
})
