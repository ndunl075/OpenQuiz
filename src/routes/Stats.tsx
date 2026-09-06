import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { Page } from '../components/layout/AppShell'
import { EmptyState } from '../components/SetCard'
import { ButtonLink } from '../components/ui/Button'
import { ProgressBar, ProgressRing } from '../components/ui/Progress'
import { useAsync } from '../hooks/useAsync'
import { db } from '../lib/db'
import { listSets } from '../store/sets'
import { tallyMastery } from '../lib/scheduler'
import { formatMs, formatRelative, pluralize } from '../lib/format'
import type { ModeStats, Progress, StudySet } from '../lib/types'

interface Row {
  set: StudySet
  mastered: number
  learning: number
  total: number
  percent: number
  stats: ModeStats[]
}

async function loadStats(): Promise<{ rows: Row[]; progress: Progress[] }> {
  const [sets, progress, modeStats] = await Promise.all([
    listSets(),
    db.progress.toArray(),
    db.modeStats.toArray(),
  ])

  const rows = sets.map((set) => {
    const byTerm = new Map(
      progress.filter((p) => p.setId === set.id).map((p) => [p.termId, p]),
    )
    const tally = tallyMastery(set.terms, byTerm)
    return {
      set,
      mastered: tally.mastered,
      learning: tally.learning,
      total: tally.total,
      percent: tally.percent,
      stats: modeStats.filter((s) => s.setId === set.id),
    }
  })

  return { rows, progress }
}

function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-[var(--oq-line)] bg-[var(--oq-surface)] px-5 py-4">
      <p className="text-2xl font-extrabold tabular-nums">{value}</p>
      <p className="mt-0.5 text-xs font-semibold text-[var(--oq-text-soft)]">{label}</p>
      {hint && <p className="mt-1 text-[11px] text-[var(--oq-text-faint)]">{hint}</p>}
    </div>
  )
}

export default function Stats() {
  const { value, loading } = useAsync(loadStats, [])

  // Derived from `value` itself: defaulting to `[]` outside the memo would
  // hand it a fresh array every render and defeat the memo entirely.
  const totals = useMemo(() => {
    const rows = value?.rows ?? []
    const progress = value?.progress ?? []
    const terms = rows.reduce((n, row) => n + row.total, 0)
    const mastered = rows.reduce((n, row) => n + row.mastered, 0)
    const learning = rows.reduce((n, row) => n + row.learning, 0)
    const answers = progress.reduce((n, p) => n + p.correct + p.incorrect, 0)
    const correct = progress.reduce((n, p) => n + p.correct, 0)
    return {
      terms,
      mastered,
      learning,
      answers,
      accuracy: answers === 0 ? 0 : Math.round((correct / answers) * 100),
      percent: terms === 0 ? 0 : Math.round((mastered / terms) * 100),
    }
  }, [value])

  const rows = value?.rows ?? []

  if (loading) return <Page />

  if (rows.length === 0) {
    return (
      <Page width="max-w-2xl">
        <h1 className="text-3xl font-extrabold">Stats</h1>
        <div className="mt-8">
          <EmptyState
            title="No progress yet"
            body="Study a set in any mode and your mastery, accuracy and personal bests will show up here."
            action={<ButtonLink to="/create">Create a set</ButtonLink>}
          />
        </div>
      </Page>
    )
  }

  return (
    <Page width="max-w-[1000px]">
      <h1 className="text-3xl font-extrabold">Stats</h1>
      <p className="mt-1.5 text-sm text-[var(--oq-text-soft)]">
        Across {pluralize(rows.length, 'set')} on this device.
      </p>

      <section className="mt-8 flex flex-wrap items-center gap-8">
        <ProgressRing value={totals.percent} size={140}>
          <div className="text-center">
            <p className="text-3xl font-extrabold">{totals.percent}%</p>
            <p className="text-[11px] font-semibold text-[var(--oq-text-faint)]">mastered</p>
          </div>
        </ProgressRing>
        <div className="grid min-w-0 flex-1 grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Terms" value={String(totals.terms)} />
          <StatTile label="Mastered" value={String(totals.mastered)} />
          <StatTile label="Still learning" value={String(totals.learning)} />
          <StatTile
            label="Accuracy"
            value={`${totals.accuracy}%`}
            hint={`${totals.answers} answers`}
          />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="mb-4 text-lg font-bold">By set</h2>
        <div className="space-y-3">
          {rows.map((row, i) => {
            const match = row.stats.find((s) => s.mode === 'match')
            const test = row.stats.find((s) => s.mode === 'test')
            const gravity = row.stats.find((s) => s.mode === 'gravity')
            const lastPlayed = row.stats.reduce((max, s) => Math.max(max, s.lastPlayed), 0)

            return (
              <motion.div
                key={row.set.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i, 8) * 0.03 }}
              >
                <Link
                  to={`/set/${row.set.id}`}
                  className="block rounded-xl border border-[var(--oq-line)] bg-[var(--oq-surface)] px-5 py-4 transition-shadow hover:oq-shadow-lg"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-bold">{row.set.title}</span>
                    <span className="text-xs font-semibold text-[var(--oq-text-faint)]">
                      {row.mastered}/{row.total} mastered
                      {lastPlayed > 0 && ` · ${formatRelative(lastPlayed)}`}
                    </span>
                  </div>
                  <ProgressBar className="mt-2.5" value={row.percent} color="var(--color-mint)" />
                  {(match || test || gravity) && (
                    <div className="mt-3 flex flex-wrap gap-4 text-[11px] font-semibold text-[var(--oq-text-soft)]">
                      {test?.bestScore !== undefined && <span>Best test {test.bestScore}%</span>}
                      {match?.bestMs !== undefined && (
                        <span>Best match {formatMs(match.bestMs)}s</span>
                      )}
                      {gravity?.bestScore !== undefined && (
                        <span>Gravity high {gravity.bestScore.toLocaleString()}</span>
                      )}
                    </div>
                  )}
                </Link>
              </motion.div>
            )
          })}
        </div>
      </section>
    </Page>
  )
}
