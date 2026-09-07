import { useEffect, useRef, useState } from 'react'
import { Page } from '../components/layout/AppShell'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Segmented, Toggle } from '../components/ui/Toggle'
import { useSettings } from '../store/useSettings'
import { importBackup, wipeLibrary } from '../lib/backup'
import { backupLibrary } from '../store/backup'
import { daysSinceBackup, describeLastBackup } from '../lib/backupReminder'
import { pluralize } from '../lib/format'
import {
  formatBytes,
  getStorageStatus,
  isInstalled,
  isIosBrowser,
  requestPersistentStorage,
  type StorageStatus,
} from '../lib/storage'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-[var(--oq-text-faint)]">
        {title}
      </h2>
      <div className="rounded-xl border border-[var(--oq-line)] bg-[var(--oq-surface)] px-5">
        {children}
      </div>
    </section>
  )
}

export default function SettingsPage() {
  const { settings, update } = useSettings()
  const fileRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<{ tone: 'ok' | 'bad'; text: string } | null>(null)
  const [confirmWipe, setConfirmWipe] = useState(false)
  const [storage, setStorage] = useState<StorageStatus | null>(null)
  // Captured once: reading the clock during render makes the output unstable.
  const [renderedAt] = useState(() => Date.now())

  useEffect(() => {
    let alive = true
    void getStorageStatus().then((status) => {
      if (alive) setStorage(status)
    })
    return () => {
      alive = false
    }
  }, [])

  const onFile = async (file: File | undefined) => {
    if (!file) return
    const result = await importBackup(await file.text())
    setMessage(
      result.ok
        ? { tone: 'ok', text: `Imported ${pluralize(result.sets, 'set')}.` }
        : { tone: 'bad', text: result.error },
    )
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <Page width="max-w-2xl">
      <h1 className="text-3xl font-extrabold">Settings</h1>
      <p className="mt-1.5 text-sm text-[var(--oq-text-soft)]">
        Everything here is stored on this device only.
      </p>

      <Section title="Appearance">
        <div className="flex items-center justify-between gap-6 py-4">
          <span className="text-sm font-semibold">Theme</span>
          <Segmented
            value={settings.theme}
            onChange={(theme) => void update({ theme })}
            options={[
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
              { value: 'system', label: 'System' },
            ]}
          />
        </div>
      </Section>

      <Section title="Studying">
        <div className="divide-y divide-[var(--oq-line)]">
          <div className="flex items-center justify-between gap-6 py-4">
            <span className="min-w-0">
              <span className="block text-sm font-semibold">Front of card</span>
              <span className="block text-xs text-[var(--oq-text-faint)]">
                Which side modes show as the prompt
              </span>
            </span>
            <Segmented
              value={settings.promptSide}
              onChange={(promptSide) => void update({ promptSide })}
              options={[
                { value: 'term', label: 'Term' },
                { value: 'definition', label: 'Definition' },
              ]}
            />
          </div>
          <Toggle
            label="Forgive typos"
            hint="A near miss warns instead of counting as wrong"
            checked={settings.typoTolerance}
            onChange={(typoTolerance) => void update({ typoTolerance })}
          />
          <Toggle
            label="Retype after a miss"
            hint="In Write, copy the correct answer once before moving on"
            checked={settings.retypeOnMiss}
            onChange={(retypeOnMiss) => void update({ retypeOnMiss })}
          />
          <Toggle
            label="Read prompts aloud"
            hint="Uses your browser's built-in speech synthesis"
            checked={settings.ttsEnabled}
            onChange={(ttsEnabled) => void update({ ttsEnabled })}
          />
          <Toggle
            label="Shuffle by default"
            checked={settings.shuffleDefault}
            onChange={(shuffleDefault) => void update({ shuffleDefault })}
          />
          <Toggle
            label="Remind me to back up"
            hint="A weekly nudge while the library has no recent backup"
            checked={settings.backupReminderDays > 0}
            onChange={(on) => void update({ backupReminderDays: on ? 7 : 0 })}
          />
        </div>
      </Section>

      <Section title="Where your sets live">
        <div className="divide-y divide-[var(--oq-line)]">
          <div className="py-4">
            <p className="text-sm font-semibold">
              Saved in this browser, on this device
            </p>
            <p className="mt-1 text-xs text-[var(--oq-text-soft)]">
              Every tab and window of this browser sees the same sets. A
              different browser on this device, and any other device, each keep
              their own separate copy — moving between them means exporting a
              backup below.
            </p>
          </div>

          {storage && storage.durability !== 'unsupported' && (
            <div className="flex flex-wrap items-center justify-between gap-4 py-4">
              <span className="min-w-0">
                <span className="block text-sm font-semibold">
                  {storage.durability === 'persistent'
                    ? 'Protected from automatic clean-up'
                    : 'Not yet protected from automatic clean-up'}
                </span>
                <span className="block text-xs text-[var(--oq-text-faint)]">
                  {storage.durability === 'persistent'
                    ? 'Your browser has agreed to keep this data even when storage runs low.'
                    : 'Your browser may clear this data if the device runs out of space.'}
                  {storage.usage !== undefined && ` Using ${formatBytes(storage.usage)}.`}
                </span>
              </span>
              {storage.durability === 'best-effort' && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={async () => {
                    await requestPersistentStorage()
                    setStorage(await getStorageStatus())
                  }}
                >
                  Ask again
                </Button>
              )}
            </div>
          )}

          {isIosBrowser() && !isInstalled() && (
            <div className="py-4">
              <p className="text-sm font-semibold text-[#8a6300]">
                On iPhone and iPad, add OpenQuiz to your Home Screen
              </p>
              <p className="mt-1 text-xs text-[var(--oq-text-soft)]">
                Safari deletes a website's saved data after seven days without
                visiting it. Adding OpenQuiz to your Home Screen — Share, then
                Add to Home Screen — exempts it from that, and it opens like an
                app. Export a backup either way.
              </p>
            </div>
          )}
        </div>
      </Section>

      <Section title="Your data">
        <div className="divide-y divide-[var(--oq-line)]">
          <div className="flex flex-wrap items-center justify-between gap-4 py-4">
            <span className="min-w-0">
              <span className="block text-sm font-semibold">Back up everything</span>
              <span className="block text-xs text-[var(--oq-text-faint)]">
                Sets, folders and progress as one JSON file —{' '}
                {describeLastBackup(daysSinceBackup(settings.lastBackupAt, renderedAt))}
              </span>
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={async () => {
                await backupLibrary()
                await update({ lastBackupAt: Date.now() })
              }}
            >
              Export
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 py-4">
            <span className="min-w-0">
              <span className="block text-sm font-semibold">Restore from a file</span>
              <span className="block text-xs text-[var(--oq-text-faint)]">
                A full backup, or a single exported set
              </span>
            </span>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              aria-label="Backup file"
              onChange={(e) => void onFile(e.target.files?.[0])}
              className="max-w-[220px] text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-soft file:px-3 file:py-2 file:text-xs file:font-semibold file:text-indigo-oq"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 py-4">
            <span className="min-w-0">
              <span className="block text-sm font-semibold">Delete everything</span>
              <span className="block text-xs text-[var(--oq-text-faint)]">
                Removes all sets and progress from this device
              </span>
            </span>
            <Button variant="danger" size="sm" onClick={() => setConfirmWipe(true)}>
              Delete all data
            </Button>
          </div>
        </div>
      </Section>

      {message && (
        <p
          role="status"
          className={
            'mt-5 rounded-lg px-4 py-3 text-sm font-semibold ' +
            (message.tone === 'ok'
              ? 'bg-mint-soft text-[#12794a]'
              : 'bg-coral-soft text-[#a63a28]')
          }
        >
          {message.text}
        </p>
      )}

      <p className="mt-10 text-center text-xs text-[var(--oq-text-faint)]">
        OpenQuiz is open source and stores nothing outside this browser.
      </p>

      <Modal
        open={confirmWipe}
        onClose={() => setConfirmWipe(false)}
        title="Delete all data?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmWipe(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                await wipeLibrary()
                setConfirmWipe(false)
                setMessage({ tone: 'ok', text: 'All data deleted from this device.' })
              }}
            >
              Delete everything
            </Button>
          </>
        }
      >
        <p className="text-sm text-[var(--oq-text-soft)]">
          Every set, folder and piece of progress will be removed from this browser. There is no
          cloud copy — export a backup first if you might want any of it back.
        </p>
      </Modal>
    </Page>
  )
}
