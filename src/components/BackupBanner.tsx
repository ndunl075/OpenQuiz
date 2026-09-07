import { motion } from 'motion/react'
import { useMemo, useState } from 'react'
import { Button, IconButton } from './ui/Button'
import { IconClose, IconShare } from './ui/Icon'
import { useAsync } from '../hooks/useAsync'
import { useSettings } from '../store/useSettings'
import { listSets } from '../store/sets'
import { backupLibrary } from '../store/backup'
import { backupReminder, describeLastBackup } from '../lib/backupReminder'

/**
 * The library lives only in this browser, so the one thing that makes it
 * recoverable is an exported file. People do not remember to do that, so the
 * app asks — once the sets have been around long enough to be worth keeping,
 * and never again for a week after a backup.
 */
export function BackupBanner() {
  const { settings, update } = useSettings()
  const { value: sets } = useAsync(listSets, [])
  const [snoozed, setSnoozed] = useState(false)
  const [saving, setSaving] = useState(false)
  // Captured once so the decision cannot flip between renders.
  const [renderedAt] = useState(() => Date.now())

  const state = useMemo(
    () =>
      backupReminder(settings, {
        setCount: sets?.length ?? 0,
        oldestSetAt: sets?.length ? Math.min(...sets.map((s) => s.createdAt)) : 0,
        now: renderedAt,
      }),
    [settings, sets, renderedAt],
  )

  if (!state.due || snoozed) return null

  return (
    <motion.aside
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className="oq-gutter mx-auto mt-6 w-full max-w-[1200px]"
      aria-label="Back up your sets"
    >
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-lemon bg-[#fff6d9] px-5 py-4 [[data-theme=dark]_&]:bg-[var(--oq-surface)]">
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-[#8a6300] [[data-theme=dark]_&]:text-lemon">
            Your sets have no backup
          </span>
          <span className="mt-0.5 block text-xs text-[var(--oq-text-soft)]">
            They live only in this browser — {describeLastBackup(state.daysSince)}. Saving a file
            takes a second and is the only way to get them back if this browser is cleared.
          </span>
        </span>
        <Button
          size="sm"
          disabled={saving}
          icon={<IconShare width={15} height={15} />}
          onClick={async () => {
            setSaving(true)
            await backupLibrary()
            await update({ lastBackupAt: Date.now() })
            setSaving(false)
          }}
        >
          Back up now
        </Button>
        <IconButton label="Not now" size="sm" onClick={() => setSnoozed(true)}>
          <IconClose width={16} height={16} />
        </IconButton>
      </div>
    </motion.aside>
  )
}
