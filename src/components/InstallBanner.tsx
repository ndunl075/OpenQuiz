import { motion } from 'motion/react'
import { Button, IconButton } from './ui/Button'
import { IconClose, IconShare } from './ui/Icon'
import { useInstallPrompt } from '../hooks/useInstallPrompt'
import { useSettings } from '../store/useSettings'

/**
 * Offered only once there are sets to lose, so a first-time visitor is not
 * asked to install something they have not tried.
 */
export function InstallBanner({ hasSets }: { hasSets: boolean }) {
  const { method, install } = useInstallPrompt()
  const { settings, update } = useSettings()

  if (!hasSets || settings.installBannerDismissed || method === 'none') return null

  const dismiss = () => void update({ installBannerDismissed: true })

  return (
    <motion.aside
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className="oq-gutter mx-auto mt-6 w-full max-w-[1200px]"
      aria-label="Install OpenQuiz"
    >
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-[var(--oq-line)] bg-indigo-soft px-5 py-4 [[data-theme=dark]_&]:bg-[var(--oq-surface)]">
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold">
            {method === 'ios-manual'
              ? 'Add OpenQuiz to your Home Screen'
              : 'Install OpenQuiz on this device'}
          </span>
          <span className="mt-0.5 block text-xs text-[var(--oq-text-soft)]">
            {method === 'ios-manual' ? (
              <>
                Safari deletes a website's saved data after seven days without a
                visit. Adding OpenQuiz to your Home Screen stops that, and it
                opens like an app. Tap <IconShare width={13} height={13} className="inline align--1" />{' '}
                then <strong>Add to Home Screen</strong>.
              </>
            ) : (
              'It opens in its own window, works offline, and your sets are less likely to be cleared.'
            )}
          </span>
        </span>

        {method === 'prompt' && (
          <Button
            size="sm"
            onClick={async () => {
              const outcome = await install()
              if (outcome !== 'unavailable') dismiss()
            }}
          >
            Install
          </Button>
        )}
        <IconButton label="Dismiss" size="sm" onClick={dismiss}>
          <IconClose width={16} height={16} />
        </IconButton>
      </div>
    </motion.aside>
  )
}
