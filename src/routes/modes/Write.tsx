import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { ModeChrome, ModeLoading, NotEnoughTerms } from '../../components/study/ModeChrome'
import { WrittenAnswer } from '../../components/study/WrittenAnswer'
import { ModeComplete, RoundSummary } from '../../components/study/RoundSummary'
import { Button, ButtonLink, IconButton } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Segmented, Toggle } from '../../components/ui/Toggle'
import { IconSound, IconStar } from '../../components/ui/Icon'
import NotFound from '../NotFound'
import { useStudySet } from '../../hooks/useStudySet'
import { useKeyboard } from '../../hooks/useKeyboard'
import { overrideAnswer, recordAnswer } from '../../store/progress'
import { toggleStar } from '../../store/sets'
import { useSettings } from '../../store/useSettings'
import { buildRound, tallyMastery } from '../../lib/scheduler'
import { grade, type Grade } from '../../lib/grade'
import { speak } from '../../lib/tts'
import type { Term } from '../../lib/types'

const ROUND_SIZE = 7

export default function Write() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { set, progress, loading, reloadProgress, reloadSet } = useStudySet(id)
  const { settings, update } = useSettings()

  const [round, setRound] = useState(1)
  const [queue, setQueue] = useState<Term[]>([])
  const [cursor, setCursor] = useState(0)
  const [typed, setTyped] = useState('')
  const [result, setResult] = useState<Grade | null>(null)
  const [retype, setRetype] = useState(false)
  const [showSummary, setShowSummary] = useState(false)
  const [optionsOpen, setOptionsOpen] = useState(false)
  const [starredOnly, setStarredOnly] = useState(false)

  const pool = useMemo(() => {
    const terms = set?.terms ?? []
    if (!starredOnly) return terms
    const starred = terms.filter((t) => t.starred)
    return starred.length > 0 ? starred : terms
  }, [set?.terms, starredOnly])

  const mastery = useMemo(() => tallyMastery(pool, progress), [pool, progress])
  const current = queue[cursor]
  const promptSide = settings.promptSide
  const promptText = current ? (promptSide === 'term' ? current.term : current.definition) : ''
  const expected = current ? (promptSide === 'term' ? current.definition : current.term) : ''

  const startRound = useCallback(() => {
    if (pool.length === 0) return
    setQueue(buildRound(pool, progress, { size: ROUND_SIZE }))
    setCursor(0)
    setTyped('')
    setResult(null)
    setRetype(false)
    setShowSummary(false)
  }, [pool, progress])

  useEffect(() => {
    if (loading || queue.length > 0 || showSummary || mastery.remaining === 0) return
    // Seeds the first round from data that only exists once the set loads.
    // oxlint-disable-next-line react/set-state-in-effect
    startRound()
  }, [loading, queue.length, showSummary, mastery.remaining, startRound])

  const nextQuestion = useCallback(async () => {
    setResult(null)
    setTyped('')
    setRetype(false)
    if (cursor + 1 < queue.length) {
      setCursor((c) => c + 1)
      return
    }
    await reloadProgress()
    setQueue([])
    setShowSummary(true)
  }, [cursor, queue.length, reloadProgress])

  const submit = useCallback(async () => {
    if (!current) return
    if (retype) {
      // Copy-the-answer step: only a real match moves on.
      if (grade(typed, expected, false) === 'correct') void nextQuestion()
      return
    }
    const verdict = grade(typed, expected, settings.typoTolerance)
    setResult(verdict)
    await recordAnswer(id, current.id, verdict !== 'incorrect')
  }, [current, expected, id, nextQuestion, retype, settings.typoTolerance, typed])

  const onContinue = useCallback(() => {
    // A miss makes you type the right answer once before moving on.
    if (result === 'incorrect' && settings.retypeOnMiss && !retype) {
      setRetype(true)
      setTyped('')
      setResult(null)
      return
    }
    void nextQuestion()
  }, [nextQuestion, result, retype, settings.retypeOnMiss])

  useKeyboard({ Enter: () => result && onContinue() })

  if (loading) return <ModeLoading />
  if (!set) return <NotFound />
  if (set.terms.length === 0) return <NotEnoughTerms setId={id} need={1} />

  const done = mastery.remaining === 0 && mastery.total > 0

  return (
    <ModeChrome
      setId={id}
      title="Write"
      subtitle={set.title}
      progress={{ value: mastery.mastered, max: mastery.total }}
      onSettings={() => setOptionsOpen(true)}
      actions={
        current && (
          <IconButton
            label={current.starred ? 'Unstar this term' : 'Star this term'}
            active={current.starred}
            onClick={async () => {
              await toggleStar(id, current.id)
              await reloadSet()
            }}
          >
            <IconStar filled={current.starred} />
          </IconButton>
        )
      }
    >
      <div className="mx-auto flex w-full max-w-[720px] flex-1 flex-col justify-center px-4 py-8 sm:px-6">
        <AnimatePresence mode="wait">
          {done ? (
            <ModeComplete
              key="done"
              title="Every term written from memory"
              body={`All ${mastery.total} terms are mastered. Reset progress from the set page to run Write again.`}
              actions={
                <>
                  <ButtonLink to={`/set/${id}/test`}>Take a test</ButtonLink>
                  <Button variant="secondary" onClick={() => navigate(`/set/${id}`)}>
                    Back to set
                  </Button>
                </>
              }
            />
          ) : showSummary ? (
            <RoundSummary
              key={`summary-${round}`}
              tally={mastery}
              round={round}
              onContinue={() => {
                setRound((r) => r + 1)
                setShowSummary(false)
              }}
            />
          ) : (
            current && (
              <motion.div
                key={`${current.id}-${cursor}-${round}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-widest text-[var(--oq-text-faint)]">
                    {retype ? 'Type the correct answer to continue' : 'Write the answer'}
                  </p>
                  <p className="text-xs font-bold text-[var(--oq-text-faint)]">
                    {cursor + 1} of {queue.length}
                  </p>
                </div>

                <div className="mt-4 flex min-h-[160px] flex-col justify-center rounded-2xl border border-[var(--oq-line)] bg-[var(--oq-surface)] px-7 py-8 oq-shadow">
                  <div className="flex items-start justify-between gap-4">
                    <p
                      data-testid="prompt"
                      className="text-xl font-semibold leading-snug sm:text-2xl"
                    >
                      {retype ? expected : promptText}
                    </p>
                    <IconButton
                      label="Read the prompt aloud"
                      size="sm"
                      onClick={() =>
                        speak(promptText, promptSide === 'term' ? set.termLang : set.defLang)
                      }
                    >
                      <IconSound width={18} height={18} />
                    </IconButton>
                  </div>
                </div>

                <div className="mt-6">
                  <WrittenAnswer
                    autoFocusKey={`${current.id}-${cursor}-${retype}`}
                    value={typed}
                    onChange={setTyped}
                    hint={retype ? 'Copy it exactly' : 'Press Enter to answer'}
                    placeholder={retype ? 'Type it out' : 'Type the answer'}
                    onSubmit={() => void submit()}
                    result={result ? { grade: result, expected } : undefined}
                    onOverride={async () => {
                      await overrideAnswer(id, current.id, progress.get(current.id))
                      setResult('correct')
                    }}
                    onContinue={onContinue}
                  />
                </div>
              </motion.div>
            )
          )}
        </AnimatePresence>
      </div>

      <Modal open={optionsOpen} onClose={() => setOptionsOpen(false)} title="Write options">
        <div className="divide-y divide-[var(--oq-line)]">
          <div className="pb-4">
            <p className="mb-2 text-sm font-semibold">Answer with</p>
            <Segmented
              value={settings.promptSide === 'term' ? 'definition' : 'term'}
              onChange={(answerWith) =>
                void update({ promptSide: answerWith === 'definition' ? 'term' : 'definition' })
              }
              options={[
                { value: 'definition', label: 'Definitions' },
                { value: 'term', label: 'Terms' },
              ]}
            />
          </div>
          <Toggle
            label="Starred terms only"
            checked={starredOnly}
            onChange={(v) => {
              setStarredOnly(v)
              setQueue([])
            }}
          />
          <Toggle
            label="Forgive typos"
            hint="Near misses warn instead of counting as wrong"
            checked={settings.typoTolerance}
            onChange={(typoTolerance) => void update({ typoTolerance })}
          />
          <Toggle
            label="Retype after a miss"
            hint="Copy the correct answer once before moving on"
            checked={settings.retypeOnMiss}
            onChange={(retypeOnMiss) => void update({ retypeOnMiss })}
          />
        </div>
      </Modal>
    </ModeChrome>
  )
}
