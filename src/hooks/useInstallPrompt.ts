import { useEffect, useState } from 'react'
import { isInstalled, isIosBrowser } from '../lib/storage'

/** Chromium fires this so a site can offer installation at its own moment. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export type InstallMethod = 'prompt' | 'ios-manual' | 'none'

/**
 * Installing matters more here than it does for most web apps: on iOS it is the
 * only thing that stops Safari deleting the library after seven days idle.
 *
 * Chromium hands us an event we can trigger from a button. Safari has no such
 * API, so there the app can only tell the user where the Share menu is.
 */
export function useInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(() => isInstalled())

  useEffect(() => {
    const onBeforeInstall = (event: Event) => {
      // Keep the event so the offer appears where it makes sense, not on load.
      event.preventDefault()
      setDeferred(event as BeforeInstallPromptEvent)
    }
    const onInstalled = () => {
      setInstalled(true)
      setDeferred(null)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const method: InstallMethod = installed
    ? 'none'
    : deferred
      ? 'prompt'
      : isIosBrowser()
        ? 'ios-manual'
        : 'none'

  async function install(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
    if (!deferred) return 'unavailable'
    await deferred.prompt()
    const { outcome } = await deferred.userChoice
    setDeferred(null)
    return outcome
  }

  return { method, installed, install }
}
