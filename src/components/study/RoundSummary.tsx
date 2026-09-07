import { motion } from 'motion/react'
import { Button } from '../ui/Button'
import { ProgressBar } from '../ui/Progress'
import type { MasteryTally } from '../../lib/scheduler'

export function RoundSummary({
  tally,
  round,
  onContinue,
}: {
  tally: MasteryTally
  round: number
  onContinue: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="mx-auto w-full max-w-lg rounded-2xl border border-[var(--oq-line)] bg-[var(--oq-surface)] px-8 py-10 text-center oq-shadow"
    >
      <p className="text-xs font-bold uppercase tracking-widest text-[var(--oq-text-faint)]">
        Round {round} complete
      </p>
      <h2 className="mt-2 text-2xl font-extrabold">Keep going — you're getting there</h2>

      <div className="mt-8 space-y-5 text-left">
        <div>
          <div className="mb-1.5 flex justify-between text-sm font-bold">
            <span>Mastered</span>
            <span className="text-mint">{tally.mastered}</span>
          </div>
          <ProgressBar value={tally.mastered} max={tally.total} color="var(--color-mint)" />
        </div>
        <div>
          <div className="mb-1.5 flex justify-between text-sm font-bold">
            <span>Still learning</span>
            <span className="text-lemon">{tally.learning}</span>
          </div>
          <ProgressBar value={tally.learning} max={tally.total} color="var(--color-lemon)" />
        </div>
        <div>
          <div className="mb-1.5 flex justify-between text-sm font-bold">
            <span>Not started</span>
            <span className="text-[var(--oq-text-faint)]">
              {tally.total - tally.mastered - tally.learning}
            </span>
          </div>
          <ProgressBar
            value={tally.total - tally.mastered - tally.learning}
            max={tally.total}
            color="var(--oq-text-faint)"
          />
        </div>
      </div>

      {/* Distinct from the per-question Continue, which reads identically to a
          screen reader while meaning something different. */}
      <Button
        size="lg"
        block
        className="mt-8"
        aria-label="Continue to the next round"
        onClick={onContinue}
      >
        Continue
      </Button>
    </motion.div>
  )
}

export function ModeComplete({
  title,
  body,
  actions,
}: {
  title: string
  body: string
  actions: React.ReactNode
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      className="mx-auto w-full max-w-lg rounded-2xl border border-[var(--oq-line)] bg-[var(--oq-surface)] px-8 py-12 text-center oq-shadow"
    >
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-mint-soft text-3xl">
        🎉
      </div>
      <h2 className="mt-5 text-2xl font-extrabold">{title}</h2>
      <p className="mt-2 text-sm text-[var(--oq-text-soft)]">{body}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">{actions}</div>
    </motion.div>
  )
}
