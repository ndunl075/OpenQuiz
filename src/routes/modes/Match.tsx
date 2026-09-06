import { useCallback, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import clsx from 'clsx'
import { ModeChrome, ModeLoading, NotEnoughTerms } from '../../components/study/ModeChrome'
import { Button, ButtonLink } from '../../components/ui/Button'
import NotFound from '../NotFound'
import { useStudySet } from '../../hooks/useStudySet'
import { useStopwatch } from '../../hooks/useStopwatch'
import { loadModeStats, recordModeStats } from '../../store/progress'
import { useAsync } from '../../hooks/useAsync'
import { sample, shuffle } from '../../lib/shuffle'
import { formatMs } from '../../lib/format'
import type { Term } from '../../lib/types'

const GRID_PAIRS = 6
const WRONG_PENALTY_MS = 1000

interface Tile {
  key: string
  termId: string
  text: string
  side: 'term' | 'definition'
}

type Phase = 'ready' | 'playing' | 'done'

function buildTiles(terms: readonly Term[]): Tile[] {
  const picked = sample(terms, Math.min(GRID_PAIRS, terms.length))
  const tiles = picked.flatMap((term) => [
    { key: `${term.id}-t`, termId: term.id, text: term.term, side: 'term' as const },
    { key: `${term.id}-d`, termId: term.id, text: term.definition, side: 'definition' as const },
  ])
  return shuffle(tiles)
}

export default function Match() {
  const { id = '' } = useParams()
  const { set, loading } = useStudySet(id)
  const { value: stats } = useAsync(() => loadModeStats(id), [id])

  const [phase, setPhase] = useState<Phase>('ready')
  const [tiles, setTiles] = useState<Tile[]>([])
  const [selected, setSelected] = useState<Tile | null>(null)
  const [cleared, setCleared] = useState<Set<string>>(new Set())
  const [wrongPair, setWrongPair] = useState<string[]>([])
  const [penalties, setPenalties] = useState(0)
  const [finalMs, setFinalMs] = useState(0)
  const [isBest, setIsBest] = useState(false)

  const { elapsed, reset, penalize } = useStopwatch(phase === 'playing')
  const best = stats?.get('match')?.bestMs

  const remaining = useMemo(
    () => tiles.filter((t) => !cleared.has(t.termId)).length,
    [tiles, cleared],
  )

  const start = useCallback(() => {
    if (!set) return
    setTiles(buildTiles(set.terms))
    setCleared(new Set())
    setSelected(null)
    setWrongPair([])
    setPenalties(0)
    reset()
    setPhase('playing')
  }, [reset, set])

  const finish = useCallback(
    async (ms: number) => {
      setFinalMs(ms)
      setPhase('done')
      const previousBest = best
      setIsBest(previousBest === undefined || ms < previousBest)
      await recordModeStats(id, 'match', { ms })
    },
    [best, id],
  )

  const pick = useCallback(
    (tile: Tile) => {
      if (phase !== 'playing' || cleared.has(tile.termId) || wrongPair.length > 0) return
      if (selected?.key === tile.key) {
        setSelected(null)
        return
      }
      if (!selected) {
        setSelected(tile)
        return
      }
      if (selected.termId === tile.termId && selected.side !== tile.side) {
        const next = new Set(cleared).add(tile.termId)
        setCleared(next)
        setSelected(null)
        // The last pair ends the game, timed at the moment it was cleared.
        if (next.size * 2 === tiles.length) void finish(elapsed)
        return
      }
      // Wrong pair: flash both, add a time penalty, then clear.
      setWrongPair([selected.key, tile.key])
      setPenalties((n) => n + 1)
      penalize(WRONG_PENALTY_MS)
      setSelected(null)
      setTimeout(() => setWrongPair([]), 450)
    },
    [cleared, elapsed, finish, penalize, phase, selected, tiles.length, wrongPair.length],
  )

  if (loading) return <ModeLoading />
  if (!set) return <NotFound />
  if (set.terms.length < 2) return <NotEnoughTerms setId={id} need={2} />

  const pairCount = Math.min(GRID_PAIRS, set.terms.length)

  return (
    <ModeChrome
      setId={id}
      title="Match"
      subtitle={set.title}
      actions={
        phase === 'playing' && (
          <span
            aria-live="off"
            className="rounded-full bg-[var(--oq-surface)] px-4 py-1.5 font-mono text-sm font-bold tabular-nums"
          >
            {formatMs(elapsed)}
          </span>
        )
      }
    >
      <div className="mx-auto flex w-full max-w-[980px] flex-1 flex-col px-4 py-6 sm:px-6">
        <AnimatePresence mode="wait">
          {phase === 'ready' && (
            <motion.div
              key="ready"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="m-auto max-w-md rounded-2xl border border-[var(--oq-line)] bg-[var(--oq-surface)] px-8 py-10 text-center oq-shadow"
            >
              <h1 className="text-2xl font-extrabold">Match</h1>
              <p className="mt-3 text-sm text-[var(--oq-text-soft)]">
                Pair every term with its definition as fast as you can. A wrong pair costs one
                second.
              </p>
              {best !== undefined && (
                <p className="mt-4 text-sm font-bold">
                  Your best: <span className="text-indigo-oq">{formatMs(best)}s</span>
                </p>
              )}
              <Button size="lg" className="mt-7" onClick={start}>
                Start game
              </Button>
              <p className="mt-3 text-xs text-[var(--oq-text-faint)]">
                {pairCount} pairs from this set
              </p>
            </motion.div>
          )}

          {phase === 'done' && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="m-auto max-w-md rounded-2xl border border-[var(--oq-line)] bg-[var(--oq-surface)] px-8 py-10 text-center oq-shadow"
            >
              <p className="text-xs font-bold uppercase tracking-widest text-[var(--oq-text-faint)]">
                {isBest ? 'New personal best' : 'Board cleared'}
              </p>
              <p className="mt-3 font-mono text-5xl font-extrabold tabular-nums">
                {formatMs(finalMs)}
                <span className="text-xl">s</span>
              </p>
              {penalties > 0 && (
                <p className="mt-2 text-xs text-[var(--oq-text-faint)]">
                  includes {penalties} second{penalties === 1 ? '' : 's'} of penalties
                </p>
              )}
              {!isBest && best !== undefined && (
                <p className="mt-3 text-sm text-[var(--oq-text-soft)]">
                  Best: {formatMs(best)}s
                </p>
              )}
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Button onClick={start}>Play again</Button>
                <ButtonLink to={`/set/${id}`} variant="secondary">
                  Back to set
                </ButtonLink>
              </div>
            </motion.div>
          )}

          {phase === 'playing' && (
            <motion.div
              key="board"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-1 flex-col"
            >
              <p className="mb-3 text-center text-xs font-bold uppercase tracking-widest text-[var(--oq-text-faint)]">
                {remaining} tiles left
              </p>
              <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {tiles.map((tile) => {
                  const isCleared = cleared.has(tile.termId)
                  const isSelected = selected?.key === tile.key
                  const isWrong = wrongPair.includes(tile.key)
                  return (
                    <motion.button
                      key={tile.key}
                      type="button"
                      layout
                      onClick={() => pick(tile)}
                      disabled={isCleared}
                      aria-label={tile.text}
                      animate={
                        isCleared
                          ? { opacity: 0, scale: 0.85 }
                          : { opacity: 1, scale: isSelected ? 1.03 : 1 }
                      }
                      transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                      className={clsx(
                        'flex min-h-[110px] items-center justify-center rounded-xl border-2 p-3 text-center',
                        'text-sm font-medium leading-snug transition-colors',
                        isCleared && 'pointer-events-none',
                        isWrong && 'animate-shake border-coral bg-coral-soft',
                        isSelected && !isWrong && 'border-indigo-oq bg-indigo-soft',
                        !isSelected &&
                          !isWrong &&
                          'border-[var(--oq-line)] bg-[var(--oq-surface)] hover:border-indigo-oq',
                      )}
                    >
                      {tile.text}
                    </motion.button>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ModeChrome>
  )
}
