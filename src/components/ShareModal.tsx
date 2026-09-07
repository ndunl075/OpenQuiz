import { useEffect, useState } from 'react'
import { Button } from './ui/Button'
import { Modal } from './ui/Modal'
import { MAX_LINK_LENGTH, buildShareLink } from '../lib/shareLink'
import type { StudySet } from '../lib/types'

export function ShareModal({
  set,
  open,
  onClose,
}: {
  set: StudySet
  open: boolean
  onClose: () => void
}) {
  const [link, setLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!open) return
    let alive = true
    // Building the link is async work against an external API (compression),
    // which is what an effect is for; the reset rides along with it.
    // oxlint-disable-next-line react/set-state-in-effect
    setCopied(false)
    void buildShareLink(set, window.location.origin, import.meta.env.BASE_URL).then((built) => {
      if (alive) setLink(built)
    })
    return () => {
      alive = false
    }
  }, [open, set])

  const tooLong = link !== null && link.length > MAX_LINK_LENGTH

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Share this set"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button
            disabled={!link || tooLong}
            onClick={async () => {
              if (!link) return
              await navigator.clipboard?.writeText(link)
              setCopied(true)
            }}
          >
            {copied ? 'Copied' : 'Copy link'}
          </Button>
        </>
      }
    >
      <p className="text-sm text-[var(--oq-text-soft)]">
        The whole set is packed into the link itself, so whoever opens it gets a copy straight
        away. There is no upload and no server involved — the part after the <code>#</code> is
        never sent anywhere, not even to whoever hosts OpenQuiz.
      </p>

      {tooLong ? (
        <p
          role="alert"
          className="mt-4 rounded-lg bg-[--color-coral-soft] px-4 py-3 text-sm font-semibold text-[#a63a28]"
        >
          This set is too big for a link. Export it to a file instead — the menu on the set page
          has JSON and CSV.
        </p>
      ) : (
        <textarea
          readOnly
          value={link ?? 'Building the link…'}
          aria-label="Share link"
          rows={4}
          onFocus={(e) => e.currentTarget.select()}
          className="mt-4 w-full rounded-lg border border-[var(--oq-line)] bg-[var(--oq-bg)] px-4 py-3 font-mono text-xs"
        />
      )}
    </Modal>
  )
}
