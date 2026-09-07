import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import clsx from 'clsx'
import { ModeChrome, ModeLoading, NotEnoughTerms } from '../../components/study/ModeChrome'
import { Button, ButtonLink } from '../../components/ui/Button'
import { Segmented } from '../../components/ui/Toggle'
import NotFound from '../NotFound'
import { useStudySet } from '../../hooks/useStudySet'
import { useAsync } from '../../hooks/useAsync'
import { loadModeStats, recordAnswer, recordModeStats } from '../../store/progress'
import { useSettings } from '../../store/useSettings'
import { grade } from '../../lib/grade'
import { shuffle } from '../../lib/shuffle'
import {
  STARTING_LIVES,
  TERMS_PER_LEVEL,
  TICK_MS,
  fallDurationMs,
  levelFor,
  pointsFor,
  type Difficulty,
} from '../../lib/gravity'
import type { Term } from '../../lib/types'

type Phase = 'ready' | 'playing' | 'over'

interface Falling {
  term: Term
  /** 0 at the top, 1 at the ground. */
  progress: number
  lane: number
}

export default function Gravity() {
  const { id = '' } = useParams()
  const { set, loading } = useStudySet(id)
  const { settings } = useSettings()
  const { value: stats } = useAsync(() => loadModeStats(id), [id])

  const [phase, setPhase] = useState<Phase>('ready')
  const [difficulty, setDifficulty] = useState<Difficulty>('normal')
  const [queue, setQueue] = useState<Term[]>([])
  const [falling, setFalling] = useState<Falling | null>(null)
  const [typed, setTyped] = useState('')
  const [score, setScore] = useState(0)
  const [level, setLevel] = useState(1)
  const [lives, setLives] = useState(STARTING_LIVES)
  const [answeredCount, setAnsweredCount] = useState(0)
  const [flash, setFlash] = useState<'hit' | 'miss' | null>(null)
  const [lastMissed, setLastMissed] = useState<Term | null>(null)
  const [isBest, setIsBest] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const best = stats?.get('gravity')?.bestScore
  const promptSide = settings.promptSide
  const fallMs = useMemo(() => fallDurationMs(difficulty, level), [difficulty, level])

  const nextTerm = useCallback(
    (from: Term[]): { term: Term | null; rest: Term[] } => {
      if (from.length > 0) return { term: from[0], rest: from.slice(1) }
      const refilled = shuffle(set?.terms ?? [])
      return { term: refilled[0] ?? null, rest: refilled.slice(1) }
    },
    [set?.terms],
  )

  const spawn = useCallback(
    (from: Term[]) => {
      const { term, rest } = nextTerm(from)
      if (!term) return
      setQueue(rest)
      setFalling({ term, progress: 0, lane: Math.floor(Math.random() * 3) })
      setTyped('')
    },
    [nextTerm],
  )

  const start = useCallback(() => {
    if (!set) return
    const deck = shuffle(set.terms)
    setScore(0)
    setLevel(1)
    setLives(STARTING_LIVES)
    setAnsweredCount(0)
    setLastMissed(null)
    setPhase('playing')
    spawn(deck)
  }, [set, spawn])

  const endGame = useCallback(
    async (finalScore: number) => {
      setPhase('over')
      setFalling(null)
      setIsBest(best === undefined || finalScore > best)
      await recordModeStats(id, 'gravity', { score: finalScore })
    },
    [best, id],
  )

  const handleMiss = useCallback(
    async (term: Term) => {
      setFlash('miss')
      setLastMissed(term)
      await recordAnswer(id, term.id, false)
      const remaining = lives - 1
      setLives(remaining)
      setTimeout(() => setFlash(null), 400)
      if (remaining <= 0) {
        await endGame(score)
        return
      }
      spawn(queue)
    },
    [endGame, id, lives, queue, score, spawn],
  )

  // The fall. One interval drives the whole game.
  useEffect(() => {
    if (phase !== 'playing' || !falling) return
    const step = TICK_MS / fallMs
    const timer = setInterval(() => {
      setFalling((current) => {
        if (!current) return current
        const progress = current.progress + step
        if (progress >= 1) {
          void handleMiss(current.term)
          return null
        }
        return { ...current, progress }
      })
    }, TICK_MS)
    return () => clearInterval(timer)
  }, [falling, fallMs, handleMiss, phase])

  useEffect(() => {
    if (phase === 'playing') inputRef.current?.focus()
  }, [phase, falling?.term.id])

  const submit = useCallback(async () => {
    if (!falling || phase !== 'playing') return
    const expected = promptSide === 'term' ? falling.term.definition : falling.term.term
    if (grade(typed, expected, settings.typoTolerance) === 'incorrect') return

    const nextScore = score + pointsFor(level, falling.progress)
    const nextAnswered = answeredCount + 1
    setScore(nextScore)
    setAnsweredCount(nextAnswered)
    setLevel(levelFor(nextAnswered))
    setFlash('hit')
    setTimeout(() => setFlash(null), 300)
    await recordAnswer(id, falling.term.id, true)
    spawn(queue)
  }, [
    answeredCount,
    falling,
    id,
    level,
    phase,
    promptSide,
    queue,
    score,
    settings.typoTolerance,
    spawn,
    typed,
  ])

  if (loading) return <ModeLoading />
  if (!set) return <NotFound />
  if (set.terms.length < 2) return <NotEnoughTerms setId={id} need={2} />

  const promptText = falling
    ? promptSide === 'term'
      ? falling.term.term
      : falling.term.definition
    : ''

  return (
    <ModeChrome
      setId={id}
      title="Gravity"
      subtitle={set.title}
      actions={
        phase === 'playing' && (
          <div className="flex items-center gap-3 text-sm font-bold">
            <span className="rounded-full bg-[var(--oq-surface)] px-3 py-1.5 tabular-nums">
              {score.toLocaleString()}
            </span>
            <span className="rounded-full bg-[var(--oq-surface)] px-3 py-1.5">Lv {level}</span>
            <span aria-label={`${lives} lives left`} className="tracking-widest">
              {'♥'.repeat(lives)}
              <span className="opacity-25">{'♥'.repeat(STARTING_LIVES - lives)}</span>
            </span>
          </div>
        )
      }
    >
      <div className="mx-auto flex w-full max-w-[860px] flex-1 flex-col px-4 py-6 sm:px-6">
        <AnimatePresence mode="wait">
          {phase === 'ready' && (
            <motion.div
              key="ready"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="m-auto max-w-md rounded-2xl border border-[var(--oq-line)] bg-[var(--oq-surface)] px-8 py-10 text-center oq-shadow"
            >
              <h1 className="text-2xl font-extrabold">Gravity</h1>
              <p className="mt-3 text-sm text-[var(--oq-text-soft)]">
                Type the answer before the term hits the ground. Three lives, and everything
                speeds up every {TERMS_PER_LEVEL} answers.
              </p>
              <div className="mt-6 flex justify-center">
                <Segmented
                  value={difficulty}
                  onChange={setDifficulty}
                  options={[
                    { value: 'easy', label: 'Easy' },
                    { value: 'normal', label: 'Normal' },
                    { value: 'hard', label: 'Hard' },
                  ]}
                />
              </div>
              {best !== undefined && (
                <p className="mt-5 text-sm font-bold">
                  High score:{' '}
                  <span className="text-indigo-oq">{best.toLocaleString()}</span>
                </p>
              )}
              <Button size="lg" className="mt-6" onClick={start}>
                Start game
              </Button>
            </motion.div>
          )}

          {phase === 'over' && (
            <motion.div
              key="over"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="m-auto max-w-md rounded-2xl border border-[var(--oq-line)] bg-[var(--oq-surface)] px-8 py-10 text-center oq-shadow"
            >
              <p className="text-xs font-bold uppercase tracking-widest text-[var(--oq-text-faint)]">
                {isBest ? 'New high score' : 'Game over'}
              </p>
              <p className="mt-3 text-5xl font-extrabold tabular-nums">
                {score.toLocaleString()}
              </p>
              <p className="mt-2 text-sm text-[var(--oq-text-soft)]">
                {answeredCount} answered · reached level {level}
              </p>
              {lastMissed && (
                <p className="mt-4 rounded-lg bg-[var(--oq-bg)] px-4 py-3 text-sm">
                  <span className="font-semibold">{lastMissed.term}</span>
                  <span className="text-[var(--oq-text-soft)]"> — {lastMissed.definition}</span>
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
              key="play"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-1 flex-col"
            >
              <div
                className={clsx(
                  'relative flex-1 overflow-hidden rounded-2xl border transition-colors',
                  flash === 'hit' && 'border-mint bg-mint-soft',
                  flash === 'miss' && 'border-coral bg-coral-soft',
                  !flash && 'border-[var(--oq-line)] bg-[var(--oq-surface)]',
                )}
                style={{ minHeight: 'clamp(300px, 46svh, 460px)' }}
              >
                {/* Ground line */}
                <div className="absolute inset-x-0 bottom-10 border-t-2 border-dashed border-[var(--oq-line)]" />

                {falling && (
                  <div
                    className="absolute w-full px-4"
                    style={{
                      top: `calc(${falling.progress * 100}% - ${falling.progress * 72}px)`,
                    }}
                  >
                    <div
                      className={clsx(
                        'mx-auto w-fit max-w-[85%] rounded-xl px-5 py-3 text-center oq-shadow',
                        'bg-indigo-oq text-white',
                      )}
                      style={{
                        marginLeft: `${8 + falling.lane * 26}%`,
                        marginRight: 'auto',
                      }}
                    >
                      <span
                        data-testid="falling-prompt"
                        className="text-base font-semibold sm:text-lg"
                      >
                        {promptText}
                      </span>
                    </div>
                  </div>
                )}

                {flash === 'miss' && lastMissed && (
                  <motion.p
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute inset-x-0 bottom-3 text-center text-sm font-bold text-[#a63a28]"
                  >
                    {lastMissed.term} — {lastMissed.definition}
                  </motion.p>
                )}
              </div>

              <div className="mt-4">
                <label htmlFor="gravity-input" className="sr-only">
                  Type the answer
                </label>
                <input
                  id="gravity-input"
                  ref={inputRef}
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter') return
                    e.preventDefault()
                    void submit()
                  }}
                  placeholder="Type the answer and press Enter"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  className="w-full rounded-xl border-2 border-[var(--oq-line)] bg-[var(--oq-surface)] px-5 py-4 text-lg font-semibold outline-none transition-colors focus:border-indigo-oq"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ModeChrome>
  )
}
