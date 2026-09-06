import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import clsx from 'clsx'
import { ModeChrome, ModeLoading, NotEnoughTerms } from '../../components/study/ModeChrome'
import { ModeComplete } from '../../components/study/RoundSummary'
import { Button, ButtonLink } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Segmented, Toggle } from '../../components/ui/Toggle'
import { IconSound } from '../../components/ui/Icon'
import NotFound from '../NotFound'
import { useStudySet } from '../../hooks/useStudySet'
import { recordAnswer } from '../../store/progress'
import { useSettings } from '../../store/useSettings'
import { diffChars, grade } from '../../lib/grade'
import { shuffle } from '../../lib/shuffle'
import { speak, ttsSupported } from '../../lib/tts'
import type { Term } from '../../lib/types'

type Phase = 'listening' | 'correct' | 'wrong'

export default function Spell() {
  const { id = '' } = useParams()
  const { set, loading } = useStudySet(id)
  const { settings, update } = useSettings()

  const [queue, setQueue] = useState<Term[]>([])
  const [cursor, setCursor] = useState(0)
  const [typed, setTyped] = useState('')
  const [phase, setPhase] = useState<Phase>('listening')
  const [rate, setRate] = useState(1)
  const [optionsOpen, setOptionsOpen] = useState(false)
  const [correctCount, setCorrectCount] = useState(0)
  const [missed, setMissed] = useState<Term[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const spellSide = settings.promptSide
  const current = queue[cursor]
  const answer = current ? (spellSide === 'term' ? current.term : current.definition) : ''
  const lang = set ? (spellSide === 'term' ? set.termLang : set.defLang) : 'en-US'
  const finished = queue.length > 0 && cursor >= queue.length

  useEffect(() => {
    if (!set || queue.length > 0) return
    // Seeds the first round from data that only exists once the set loads.
    // oxlint-disable-next-line react/set-state-in-effect
    setQueue(shuffle(set.terms))
  }, [set, queue.length])

  const say = useCallback(() => {
    if (answer) speak(answer, lang, rate)
  }, [answer, lang, rate])

  // Read each new prompt automatically.
  useEffect(() => {
    if (phase !== 'listening' || !answer) return
    if (settings.ttsEnabled) say()
    inputRef.current?.focus()
  }, [answer, phase, say, settings.ttsEnabled])

  const diff = useMemo(() => diffChars(typed, answer), [typed, answer])

  const advance = useCallback(() => {
    setTyped('')
    setPhase('listening')
    setCursor((c) => c + 1)
  }, [])

  const submit = useCallback(async () => {
    if (!current || phase !== 'listening') return
    const verdict = grade(typed, answer, false)
    if (verdict === 'correct') {
      setPhase('correct')
      setCorrectCount((n) => n + 1)
      await recordAnswer(id, current.id, true)
      setTimeout(advance, 850)
    } else {
      setPhase('wrong')
      setMissed((m) => (m.some((t) => t.id === current.id) ? m : [...m, current]))
      await recordAnswer(id, current.id, false)
    }
  }, [advance, answer, current, id, phase, typed])

  const restart = useCallback(
    (onlyMissed: boolean) => {
      const next = onlyMissed ? missed : shuffle(set?.terms ?? [])
      setQueue(next)
      setCursor(0)
      setTyped('')
      setPhase('listening')
      setCorrectCount(0)
      setMissed([])
    },
    [missed, set?.terms],
  )

  if (loading) return <ModeLoading />
  if (!set) return <NotFound />
  if (set.terms.length === 0) return <NotEnoughTerms setId={id} need={1} />

  return (
    <ModeChrome
      setId={id}
      title="Spell"
      subtitle={set.title}
      progress={{ value: Math.min(cursor, queue.length), max: queue.length }}
      onSettings={() => setOptionsOpen(true)}
    >
      <div className="mx-auto flex w-full max-w-[680px] flex-1 flex-col justify-center px-4 py-8 sm:px-6">
        {!ttsSupported() && (
          <p className="mb-6 rounded-lg bg-[#fff6d9] px-4 py-3 text-sm font-semibold text-[#8a6300]">
            This browser has no speech synthesis, so the prompt is shown instead of spoken.
          </p>
        )}

        <AnimatePresence mode="wait">
          {finished ? (
            <ModeComplete
              key="done"
              title={missed.length === 0 ? 'Perfect spelling' : 'Round finished'}
              body={`${correctCount} of ${queue.length} spelled correctly.`}
              actions={
                <>
                  {missed.length > 0 && (
                    <Button onClick={() => restart(true)}>
                      Practise the {missed.length} you missed
                    </Button>
                  )}
                  <Button variant="secondary" onClick={() => restart(false)}>
                    Start over
                  </Button>
                  <ButtonLink to={`/set/${id}`} variant="ghost">
                    Back to set
                  </ButtonLink>
                </>
              }
            />
          ) : (
            current && (
              <motion.div
                key={`${current.id}-${cursor}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.18 }}
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-widest text-[var(--oq-text-faint)]">
                    Spell what you hear
                  </p>
                  <p className="text-xs font-bold text-[var(--oq-text-faint)]">
                    {cursor + 1} of {queue.length}
                  </p>
                </div>

                <div className="mt-4 flex flex-col items-center rounded-2xl border border-[var(--oq-line)] bg-[var(--oq-surface)] px-7 py-10 oq-shadow">
                  <button
                    type="button"
                    onClick={say}
                    aria-label="Play the audio again"
                    className={clsx(
                      'grid h-20 w-20 place-items-center rounded-full bg-[--color-indigo-oq] text-white transition-transform hover:scale-105',
                      phase === 'listening' && 'animate-pulse-ring',
                    )}
                  >
                    <IconSound width={32} height={32} />
                  </button>
                  <p className="mt-4 text-xs text-[var(--oq-text-faint)]">
                    Click to hear it again
                  </p>
                  {!ttsSupported() && (
                    <p className="mt-4 text-xl font-semibold">{answer}</p>
                  )}
                  <p
                    data-testid="spell-hint"
                    className="mt-4 text-center text-sm text-[var(--oq-text-soft)]"
                  >
                    {spellSide === 'term' ? current.definition : current.term}
                  </p>
                </div>

                <div
                  className={clsx(
                    'mt-6 rounded-xl border-2 px-5 py-4 transition-colors',
                    phase === 'correct' && 'border-[--color-mint] bg-[--color-mint-soft]',
                    phase === 'wrong' && 'animate-shake border-[--color-coral] bg-[--color-coral-soft]',
                    phase === 'listening' && 'border-[var(--oq-line)] bg-[var(--oq-surface)]',
                  )}
                >
                  <label
                    htmlFor="spell-input"
                    className="block text-[11px] font-bold uppercase tracking-wider text-[var(--oq-text-faint)]"
                  >
                    Type what you hear
                  </label>
                  {phase === 'wrong' ? (
                    <p className="mt-1 text-lg font-semibold tracking-wide">
                      {diff.map((d, i) => (
                        <span
                          key={i}
                          className={clsx(
                            d.ok ? '' : 'rounded bg-[--color-coral] px-0.5 text-white',
                          )}
                        >
                          {d.char}
                        </span>
                      ))}
                    </p>
                  ) : (
                    <input
                      id="spell-input"
                      ref={inputRef}
                      value={typed}
                      readOnly={phase !== 'listening'}
                      onChange={(e) => setTyped(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key !== 'Enter') return
                        e.preventDefault()
                        void submit()
                      }}
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck={false}
                      className="mt-1 w-full bg-transparent text-lg font-semibold outline-none placeholder:font-normal placeholder:text-[var(--oq-text-faint)]"
                      placeholder="Start typing"
                    />
                  )}
                </div>

                {phase === 'wrong' && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4"
                    role="status"
                  >
                    <p className="text-sm font-bold text-[#a63a28]">The correct spelling is</p>
                    <p className="mt-1 text-lg font-semibold">{answer}</p>
                    <Button className="mt-4" onClick={advance}>
                      Continue <span className="ml-1 opacity-60">↵</span>
                    </Button>
                  </motion.div>
                )}

                {phase === 'listening' && (
                  <div className="mt-4 flex items-center justify-between gap-4">
                    <span className="text-xs text-[var(--oq-text-faint)]">
                      Press Enter to check
                    </span>
                    <Button onClick={() => void submit()} disabled={!typed.trim()}>
                      Check
                    </Button>
                  </div>
                )}
              </motion.div>
            )
          )}
        </AnimatePresence>
      </div>

      <Modal open={optionsOpen} onClose={() => setOptionsOpen(false)} title="Spell options">
        <div className="divide-y divide-[var(--oq-line)]">
          <div className="pb-4">
            <p className="mb-2 text-sm font-semibold">Spell the</p>
            <Segmented
              value={settings.promptSide}
              onChange={(promptSide) => void update({ promptSide })}
              options={[
                { value: 'term', label: 'Term' },
                { value: 'definition', label: 'Definition' },
              ]}
            />
          </div>
          <div className="py-4">
            <p className="mb-2 text-sm font-semibold">Speech speed</p>
            <Segmented
              value={String(rate)}
              onChange={(v) => setRate(Number(v))}
              options={[
                { value: '0.6', label: 'Slow' },
                { value: '1', label: 'Normal' },
                { value: '1.4', label: 'Fast' },
              ]}
            />
          </div>
          <Toggle
            label="Read prompts aloud"
            hint="Turn off to spell from the written hint alone"
            checked={settings.ttsEnabled}
            onChange={(ttsEnabled) => void update({ ttsEnabled })}
          />
        </div>
      </Modal>
    </ModeChrome>
  )
}
