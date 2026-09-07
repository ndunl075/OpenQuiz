import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { Page } from '../components/layout/AppShell'
import { Button, ButtonLink } from '../components/ui/Button'
import { decodeSet, payloadToSet, type SharePayload } from '../lib/shareLink'
import { saveSet } from '../store/sets'
import { pluralize } from '../lib/format'

/**
 * Receives a shared link. The set travels in the fragment, so it is already on
 * this device by the time this renders — nothing is fetched. It is previewed
 * rather than saved outright, because opening a link should not silently add
 * things to someone's library.
 */
export default function SharedSet() {
  const navigate = useNavigate()
  const [payload, setPayload] = useState<SharePayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let alive = true
    void decodeSet(window.location.hash).then((result) => {
      if (!alive) return
      if (result.ok) setPayload(result.payload)
      else setError(result.error)
    })
    return () => {
      alive = false
    }
  }, [])

  const preview = useMemo(() => (payload ? payloadToSet(payload) : null), [payload])

  if (error) {
    return (
      <Page width="max-w-lg" className="text-center">
        <h1 className="mt-12 text-2xl font-extrabold">This link didn't work</h1>
        <p className="mt-3 text-sm text-[var(--oq-text-soft)]">{error}</p>
        <p className="mt-2 text-sm text-[var(--oq-text-soft)]">
          Links carry the whole set, so they can be broken by an app that shortens or wraps them.
          Ask for it again, or have the sender export the set to a file instead.
        </p>
        <ButtonLink to="/home" className="mt-8">
          Go to your sets
        </ButtonLink>
      </Page>
    )
  }

  if (!preview) return <Page width="max-w-lg" />

  return (
    <Page width="max-w-2xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-xs font-bold uppercase tracking-widest text-[var(--oq-text-faint)]">
          Shared with you
        </p>
        <h1 className="mt-2 text-3xl font-extrabold">{preview.title}</h1>
        {preview.description && (
          <p className="mt-2 text-sm text-[var(--oq-text-soft)]">{preview.description}</p>
        )}
        <p className="mt-3 text-xs font-semibold text-[var(--oq-text-faint)]">
          {pluralize(preview.terms.length, 'term')} · nothing is saved until you add it
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button
            size="lg"
            disabled={saving || preview.terms.length === 0}
            onClick={async () => {
              setSaving(true)
              const saved = await saveSet(preview)
              navigate(`/set/${saved.id}`, { replace: true })
            }}
          >
            Add to my sets
          </Button>
          <ButtonLink to="/home" variant="secondary" size="lg">
            No thanks
          </ButtonLink>
        </div>

        <ul className="mt-8 space-y-2">
          {preview.terms.map((term) => (
            <li
              key={term.id}
              className="grid gap-2 rounded-xl border border-[var(--oq-line)] bg-[var(--oq-surface)] px-5 py-3 sm:grid-cols-2"
            >
              <span className="text-sm font-semibold">{term.term}</span>
              <span className="text-sm text-[var(--oq-text-soft)]">{term.definition}</span>
            </li>
          ))}
        </ul>
      </motion.div>
    </Page>
  )
}
