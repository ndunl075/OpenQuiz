import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { ModeChrome, ModeLoading, NotEnoughTerms } from '../../components/study/ModeChrome'
import { ChoiceGrid } from '../../components/study/ChoiceGrid'
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
import { buildRound, questionKindForBox, tallyMastery } from '../../lib/scheduler'
import { grade, type Grade } from '../../lib/grade'
import { sample, shuffle } from '../../lib/shuffle'
import { speak } from '../../lib/tts'
import type { Progress, Term, TermId } from '../../lib/types'

const ROUND_SIZE = 7

interface Question {
  term: Term
  kind: 'choice' | 'written'
  choices: Term[]
}

interface Answered {
  grade: Grade
  pickedId?: string
}

function buildQuestions(
  round: Term[],
  allTerms: readonly Term[],
  progress: ReadonlyMap<TermId, Progress>,
  forceWritten: boolean,
): Question[] {
  return round.map((term) => {
    const box = progress.get(term.id)?.box ?? 0
    const kind = forceWritten ? 'written' : questionKindForBox(box)
    const distractors = sample(
      allTerms.filter((t) => t.id !== term.id),
      3,
    )
    return { term, kind, choices: shuffle([term, ...distractors]) }
  })
}

export default function Learn() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { set, progress, loading, reloadProgress, reloadSet } = useStudySet(id)
  const { settings, update } = useSettings()

  const [round, setRound] = useState(1)
  const [questions, setQuestions] = useState<Question[]>([])
  const [cursor, setCursor] = useState(0)
  const [typed, setTyped] = useState('')
  const [answered, setAnswered] = useState<Answered | null>(null)
  const [showSummary, setShowSummary] = useState(false)
  const [optionsOpen, setOptionsOpen] = useState(false)
  const [forceWritten, setForceWritten] = useState(false)
  const [starredOnly, setStarredOnly] = useState(false)
  const lastTermId = useRef<TermId | undefined>(undefined)

  const pool = useMemo(() => {
    const terms = set?.terms ?? []
    if (!starredOnly) return terms
    const starred = terms.filter((t) => t.starred)
    return starred.length >= 4 ? starred : terms
  }, [set?.terms, starredOnly])

  const mastery = useMemo(() => tallyMastery(pool, progress), [pool, progress])
  const question = questions[cursor]
  const promptSide = settings.promptSide
  const promptText = question
    ? promptSide === 'term'
      ? question.term.term
      : question.term.definition
    : ''
  const expected = question
    ? promptSide === 'term'
      ? question.term.definition
      : question.term.term
    : ''

  const startRound = useCallback(() => {
    if (pool.length === 0) return
    const next = buildRound(pool, progress, {
      size: ROUND_SIZE,
      lastTermId: lastTermId.current,
    })
    setQuestions(buildQuestions(next, pool, progress, forceWritten))
    setCursor(0)
    setTyped('')
    setAnswered(null)
    setShowSummary(false)
  }, [pool, progress, forceWritten])

  // Kick off the first round once the set has loaded.
  useEffect(() => {
    if (loading || questions.length > 0 || showSummary || mastery.remaining === 0) return
    startRound()
  }, [loading, questions.length, showSummary, mastery.remaining, startRound])

  const commit = useCallback(
    async (result: Grade, pickedId?: string) => {
      if (!question) return
      setAnswered({ grade: result, pickedId })
      lastTermId.current = question.term.id
      await recordAnswer(id, question.term.id, result !== 'incorrect')
    },
    [id, question],
  )

  const advance = useCallback(async () => {
    setAnswered(null)
    setTyped('')
    if (cursor + 1 < questions.length) {
      setCursor((c) => c + 1)
      return
    }
    await reloadProgress()
    setQuestions([])
    setShowSummary(true)
  }, [cursor, questions.length, reloadProgress])

  const override = useCallback(async () => {
    if (!question) return
    // `progress` is the state as of the start of the round, and a term is
    // served at most once per round, so this is the pre-answer row.
    await overrideAnswer(id, question.term.id, progress.get(question.term.id))
    setAnswered({ grade: 'correct' })
  }, [id, progress, question])

  useKeyboard({
    '1': () => question?.kind === 'choice' && !answered && pick(0),
    '2': () => question?.kind === 'choice' && !answered && pick(1),
    '3': () => question?.kind === 'choice' && !answered && pick(2),
    '4': () => question?.kind === 'choice' && !answered && pick(3),
    Enter: () => answered && void advance(),
  })

  function pick(optionIndex: number) {
    const choice = question?.choices[optionIndex]
    if (!choice || !question) return
    void commit(choice.id === question.term.id ? 'correct' : 'incorrect', choice.id)
  }

  if (loading) return <ModeLoading />
  if (!set) return <NotFound />
  if (set.terms.length < 4) return <NotEnoughTerms setId={id} need={4} />

  const done = mastery.remaining === 0 && mastery.total > 0

  return (
    <ModeChrome
      setId={id}
      title="Learn"
      subtitle={set.title}
      progress={{ value: mastery.mastered, max: mastery.total }}
      onSettings={() => setOptionsOpen(true)}
      actions={
        question && (
          <IconButton
            label={question.term.starred ? 'Unstar this term' : 'Star this term'}
            active={question.term.starred}
            onClick={async () => {
              await toggleStar(id, question.term.id)
              await reloadSet()
            }}
          >
            <IconStar filled={question.term.starred} />
          </IconButton>
        )
      }
    >
      <div className="mx-auto flex w-full max-w-[760px] flex-1 flex-col justify-center px-4 py-8 sm:px-6">
        <AnimatePresence mode="wait">
          {done ? (
            <ModeComplete
              key="done"
              title="You've mastered this set"
              body={`All ${mastery.total} terms are locked in. Try Test mode to prove it, or reset progress from the set page to run it again.`}
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
            question && (
              <motion.div
                key={`${question.term.id}-${cursor}-${round}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-widest text-[var(--oq-text-faint)]">
                    {question.kind === 'choice' ? 'Choose the answer' : 'Write the answer'}
                  </p>
                  <p className="text-xs font-bold text-[var(--oq-text-faint)]">
                    {cursor + 1} of {questions.length}
                  </p>
                </div>

                <div className="mt-4 flex min-h-[168px] flex-col justify-center rounded-2xl border border-[var(--oq-line)] bg-[var(--oq-surface)] px-7 py-8 oq-shadow">
                  <div className="flex items-start justify-between gap-4">
                    <p
                      data-testid="prompt"
                      className="text-xl font-semibold leading-snug sm:text-2xl"
                    >
                      {promptText}
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
                  {question.kind === 'choice' ? (
                    <>
                      <ChoiceGrid
                        choices={question.choices}
                        side={promptSide === 'term' ? 'definition' : 'term'}
                        state={{
                          pickedId: answered?.pickedId,
                          correctId: answered ? question.term.id : undefined,
                        }}
                        onPick={(choice) =>
                          void commit(
                            choice.id === question.term.id ? 'correct' : 'incorrect',
                            choice.id,
                          )
                        }
                      />
                      {answered && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="mt-6 flex justify-end"
                        >
                          <Button onClick={() => void advance()}>
                            Continue{' '}
                <span aria-hidden className="ml-1 opacity-60">
                  ↵
                </span>
                          </Button>
                        </motion.div>
                      )}
                    </>
                  ) : (
                    <WrittenAnswer
                      autoFocusKey={`${question.term.id}-${cursor}`}
                      value={typed}
                      onChange={setTyped}
                      hint="Press Enter to answer"
                      onSubmit={() =>
                        void commit(grade(typed, expected, settings.typoTolerance))
                      }
                      result={answered ? { grade: answered.grade, expected } : undefined}
                      onOverride={() => void override()}
                      onContinue={() => void advance()}
                    />
                  )}
                </div>
              </motion.div>
            )
          )}
        </AnimatePresence>
      </div>

      <Modal open={optionsOpen} onClose={() => setOptionsOpen(false)} title="Learn options">
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
            label="Written questions only"
            hint="Skip multiple choice and type every answer"
            checked={forceWritten}
            onChange={(v) => {
              setForceWritten(v)
              setQuestions([])
            }}
          />
          <Toggle
            label="Starred terms only"
            hint="Needs at least four starred terms"
            checked={starredOnly}
            onChange={(v) => {
              setStarredOnly(v)
              setQuestions([])
            }}
          />
          <Toggle
            label="Forgive typos"
            hint="Near misses warn instead of counting as wrong"
            checked={settings.typoTolerance}
            onChange={(typoTolerance) => void update({ typoTolerance })}
          />
        </div>
      </Modal>
    </ModeChrome>
  )
}
