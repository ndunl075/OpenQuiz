import { useCallback, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import clsx from 'clsx'
import { ModeChrome, ModeLoading, NotEnoughTerms } from '../../components/study/ModeChrome'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { ProgressRing } from '../../components/ui/Progress'
import { Segmented, Toggle } from '../../components/ui/Toggle'
import { IconCheck, IconClose } from '../../components/ui/Icon'
import NotFound from '../NotFound'
import { useStudySet } from '../../hooks/useStudySet'
import { recordAnswer, recordModeStats } from '../../store/progress'
import { useSettings } from '../../store/useSettings'
import {
  DEFAULT_TEST_CONFIG,
  answerSide,
  buildTest,
  sideText,
  totalWeight,
  type QuestionType,
  type TestConfig,
  type TestQuestion,
} from '../../lib/buildTest'
import { grade } from '../../lib/grade'


type Answers = Record<string, string>
/** Matching answers are keyed `${questionId}:${promptTermId}` -> answer term id. */
type Matches = Record<string, string>

interface Marked {
  correct: number
  total: number
  perQuestion: Map<string, boolean | Map<string, boolean>>
}

const TYPE_LABELS: Array<{ value: QuestionType; label: string }> = [
  { value: 'written', label: 'Written' },
  { value: 'choice', label: 'Multiple choice' },
  { value: 'trueFalse', label: 'True / false' },
  { value: 'matching', label: 'Matching' },
]

export default function Test() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { set, loading } = useStudySet(id)
  const { settings } = useSettings()

  const [config, setConfig] = useState<TestConfig>({
    ...DEFAULT_TEST_CONFIG,
    promptSide: settings.promptSide,
  })
  const [questions, setQuestions] = useState<TestQuestion[] | null>(null)
  const [answers, setAnswers] = useState<Answers>({})
  const [matches, setMatches] = useState<Matches>({})
  const [marked, setMarked] = useState<Marked | null>(null)

  const maxQuestions = Math.min(50, set?.terms.length ?? 0)

  const start = useCallback(() => {
    if (!set) return
    setQuestions(buildTest(set.terms, { ...config, questionCount: Math.min(config.questionCount, maxQuestions) }))
    setAnswers({})
    setMatches({})
    setMarked(null)
  }, [config, maxQuestions, set])

  const submit = useCallback(async () => {
    if (!questions) return
    const perQuestion: Marked['perQuestion'] = new Map()
    let correct = 0

    for (const question of questions) {
      if (question.type === 'matching') {
        const results = new Map<string, boolean>()
        for (const pair of question.prompts) {
          const ok = matches[`${question.id}:${pair.id}`] === pair.id
          results.set(pair.id, ok)
          if (ok) correct++
          await recordAnswer(id, pair.id, ok)
        }
        perQuestion.set(question.id, results)
        continue
      }

      const given = answers[question.id] ?? ''
      let ok: boolean
      if (question.type === 'trueFalse') ok = given === String(question.isTrue)
      else if (question.type === 'choice') ok = given === question.term.id
      else ok = grade(given, question.expected, settings.typoTolerance) !== 'incorrect'

      perQuestion.set(question.id, ok)
      if (ok) correct++
      await recordAnswer(id, question.term.id, ok)
    }

    const total = totalWeight(questions)
    const score = total === 0 ? 0 : Math.round((correct / total) * 100)
    await recordModeStats(id, 'test', { score })
    setMarked({ correct, total, perQuestion })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [answers, id, matches, questions, settings.typoTolerance])

  if (loading) return <ModeLoading />
  if (!set) return <NotFound />
  if (set.terms.length < 2) return <NotEnoughTerms setId={id} need={2} />

  const answeredCount = questions
    ? questions.filter((q) =>
        q.type === 'matching'
          ? q.prompts.every((p) => matches[`${q.id}:${p.id}`])
          : answers[q.id] !== undefined && answers[q.id] !== '',
      ).length
    : 0

  return (
    <ModeChrome
      setId={id}
      title="Test"
      subtitle={set.title}
      progress={questions && !marked ? { value: answeredCount, max: questions.length } : undefined}
    >
      <div className="mx-auto w-full max-w-[820px] flex-1 px-4 py-8 sm:px-6">
        {!questions ? (
          <ConfigScreen
            config={config}
            maxQuestions={maxQuestions}
            onChange={setConfig}
            onStart={start}
          />
        ) : marked ? (
          <Results
            marked={marked}
            questions={questions}
            answers={answers}
            matches={matches}
            onRetake={() => setQuestions(null)}
            onBack={() => navigate(`/set/${id}`)}
          />
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void submit()
            }}
          >
            <div className="space-y-5">
              {questions.map((question, index) => (
                <QuestionCard
                  key={question.id}
                  index={index}
                  question={question}
                  answers={answers}
                  matches={matches}
                  onAnswer={(value) => setAnswers((a) => ({ ...a, [question.id]: value }))}
                  onMatch={(promptId, answerId) =>
                    setMatches((m) => ({ ...m, [`${question.id}:${promptId}`]: answerId }))
                  }
                />
              ))}
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-[var(--oq-line)] pt-6">
              <p className="text-sm text-[var(--oq-text-soft)]">
                {answeredCount} of {questions.length} answered
              </p>
              <div className="flex gap-3">
                <Button type="button" variant="ghost" onClick={() => setQuestions(null)}>
                  Change options
                </Button>
                <Button type="submit" size="lg">
                  Submit test
                </Button>
              </div>
            </div>
          </form>
        )}
      </div>
    </ModeChrome>
  )
}

function ConfigScreen({
  config,
  maxQuestions,
  onChange,
  onStart,
}: {
  config: TestConfig
  maxQuestions: number
  onChange: (config: TestConfig) => void
  onStart: () => void
}) {
  const noTypes = !Object.values(config.types).some(Boolean)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-lg rounded-2xl border border-[var(--oq-line)] bg-[var(--oq-surface)] px-7 py-8 oq-shadow"
    >
      <h1 className="text-2xl font-extrabold">Set up your test</h1>
      <p className="mt-1.5 text-sm text-[var(--oq-text-soft)]">
        Questions are generated fresh each time, and no term is used twice.
      </p>

      <div className="mt-7 space-y-6">
        <label className="block">
          <span className="text-sm font-semibold">Questions</span>
          <div className="mt-2 flex items-center gap-4">
            <input
              type="range"
              min={1}
              max={Math.max(1, maxQuestions)}
              value={Math.min(config.questionCount, maxQuestions)}
              onChange={(e) => onChange({ ...config, questionCount: Number(e.target.value) })}
              className="flex-1 accent-indigo-oq"
              aria-label="Number of questions"
            />
            <Input
              type="number"
              min={1}
              max={maxQuestions}
              value={Math.min(config.questionCount, maxQuestions)}
              onChange={(e) => onChange({ ...config, questionCount: Number(e.target.value) })}
              aria-label="Question count"
              className="!w-20 !py-2 text-center"
            />
          </div>
          <span className="mt-1 block text-xs text-[var(--oq-text-faint)]">
            {maxQuestions} available in this set
          </span>
        </label>

        <fieldset>
          <legend className="text-sm font-semibold">Question types</legend>
          <div className="mt-2 divide-y divide-[var(--oq-line)]">
            {TYPE_LABELS.map((type) => (
              <Toggle
                key={type.value}
                label={type.label}
                checked={config.types[type.value]}
                onChange={(checked) =>
                  onChange({ ...config, types: { ...config.types, [type.value]: checked } })
                }
              />
            ))}
          </div>
          {noTypes && (
            <p role="alert" className="mt-2 text-xs font-semibold text-coral">
              Pick at least one question type.
            </p>
          )}
        </fieldset>

        <div>
          <p className="mb-2 text-sm font-semibold">Answer with</p>
          <Segmented
            value={config.promptSide === 'term' ? 'definition' : 'term'}
            onChange={(answerWith) =>
              onChange({ ...config, promptSide: answerWith === 'definition' ? 'term' : 'definition' })
            }
            options={[
              { value: 'definition', label: 'Definitions' },
              { value: 'term', label: 'Terms' },
            ]}
          />
        </div>

        <div className="divide-y divide-[var(--oq-line)] border-t border-[var(--oq-line)]">
          <Toggle
            label="Starred terms only"
            checked={config.starredOnly}
            onChange={(starredOnly) => onChange({ ...config, starredOnly })}
          />
        </div>
      </div>

      <Button size="lg" block className="mt-8" onClick={onStart} disabled={noTypes}>
        Start test
      </Button>
    </motion.div>
  )
}

function QuestionCard({
  index,
  question,
  answers,
  matches,
  onAnswer,
  onMatch,
}: {
  index: number
  question: TestQuestion
  answers: Answers
  matches: Matches
  onAnswer: (value: string) => void
  onMatch: (promptId: string, answerId: string) => void
}) {
  return (
    <motion.fieldset
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 8) * 0.03, duration: 0.2 }}
      className="rounded-2xl border border-[var(--oq-line)] bg-[var(--oq-surface)] px-6 py-6 oq-shadow"
    >
      <legend className="px-1 text-[11px] font-bold uppercase tracking-widest text-[var(--oq-text-faint)]">
        Question {index + 1}
      </legend>

      {question.type === 'matching' ? (
        <>
          <p className="mb-4 text-sm font-semibold">Match each prompt with its answer.</p>
          <div className="space-y-3">
            {question.prompts.map((prompt) => (
              <div key={prompt.id} className="grid items-center gap-3 sm:grid-cols-2">
                <span className="text-sm font-semibold">
                  {sideText(prompt, question.promptSide)}
                </span>
                <select
                  value={matches[`${question.id}:${prompt.id}`] ?? ''}
                  onChange={(e) => onMatch(prompt.id, e.target.value)}
                  aria-label={`Answer for ${sideText(prompt, question.promptSide)}`}
                  className="rounded-lg border border-[var(--oq-line)] bg-[var(--oq-surface)] px-3 py-2.5 text-base pointer-fine:text-sm"
                >
                  <option value="">Choose…</option>
                  {question.answers.map((answer) => (
                    <option key={answer.id} value={answer.id}>
                      {sideText(answer, answerSide(question.promptSide))}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <p className="mt-1 text-lg font-semibold leading-snug">{question.prompt}</p>

          {question.type === 'written' && (
            <Input
              value={answers[question.id] ?? ''}
              onChange={(e) => onAnswer(e.target.value)}
              placeholder="Type the answer"
              aria-label={`Answer for question ${index + 1}`}
              className="mt-4"
            />
          )}

          {question.type === 'choice' && (
            <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
              {question.choices.map((choice) => {
                const picked = answers[question.id] === choice.id
                return (
                  <button
                    key={choice.id}
                    type="button"
                    onClick={() => onAnswer(choice.id)}
                    aria-pressed={picked}
                    className={clsx(
                      'rounded-xl border-2 px-4 py-3 text-left text-sm font-medium transition-colors',
                      picked
                        ? 'border-indigo-oq bg-indigo-soft'
                        : 'border-[var(--oq-line)] hover:border-indigo-oq',
                    )}
                  >
                    {sideText(choice, answerSide(question.promptSide))}
                  </button>
                )
              })}
            </div>
          )}

          {question.type === 'trueFalse' && (
            <>
              <p className="mt-3 rounded-lg bg-[var(--oq-bg)] px-4 py-3 text-sm">
                {question.shown}
              </p>
              <div className="mt-4 flex gap-3">
                {[
                  { value: 'true', label: 'True' },
                  { value: 'false', label: 'False' },
                ].map((option) => {
                  const picked = answers[question.id] === option.value
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => onAnswer(option.value)}
                      aria-pressed={picked}
                      className={clsx(
                        'flex-1 rounded-xl border-2 px-4 py-3 text-sm font-bold transition-colors',
                        picked
                          ? 'border-indigo-oq bg-indigo-soft'
                          : 'border-[var(--oq-line)] hover:border-indigo-oq',
                      )}
                    >
                      {option.label}
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </>
      )}
    </motion.fieldset>
  )
}

function Results({
  marked,
  questions,
  answers,
  matches,
  onRetake,
  onBack,
}: {
  marked: Marked
  questions: TestQuestion[]
  answers: Answers
  matches: Matches
  onRetake: () => void
  onBack: () => void
}) {
  const percent = marked.total === 0 ? 0 : Math.round((marked.correct / marked.total) * 100)
  const tone = percent >= 80 ? 'var(--color-mint)' : percent >= 50 ? 'var(--color-lemon)' : 'var(--color-coral)'

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-2xl border border-[var(--oq-line)] bg-[var(--oq-surface)] px-8 py-10 text-center oq-shadow"
      >
        <h1 className="text-xs font-bold uppercase tracking-widest text-[var(--oq-text-faint)]">
          Your results
        </h1>
        <div className="mt-6 flex justify-center">
          <ProgressRing value={percent} color={tone}>
            <div>
              <p className="text-3xl font-extrabold">{percent}%</p>
              <p className="text-xs font-semibold text-[var(--oq-text-faint)]">
                {marked.correct}/{marked.total}
              </p>
            </div>
          </ProgressRing>
        </div>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button onClick={onRetake}>Take a new test</Button>
          <Button variant="secondary" onClick={onBack}>
            Back to set
          </Button>
        </div>
      </motion.div>

      <h2 className="mt-10 mb-4 text-lg font-bold">Review</h2>
      <div className="space-y-4">
        <AnimatePresence>
          {questions.map((question, index) => {
            const result = marked.perQuestion.get(question.id)

            if (question.type === 'matching' && result instanceof Map) {
              return (
                <ReviewCard key={question.id} index={index} ok={[...result.values()].every(Boolean)}>
                  <div className="mt-3 space-y-2">
                    {question.prompts.map((prompt) => {
                      const pickedId = matches[`${question.id}:${prompt.id}`]
                      const picked = question.answers.find((a) => a.id === pickedId)
                      const ok = result.get(prompt.id) ?? false
                      const side = answerSide(question.promptSide)
                      return (
                        <div key={prompt.id} className="text-sm">
                          <span className="font-semibold">
                            {sideText(prompt, question.promptSide)}
                          </span>
                          <span className={ok ? 'text-mint' : 'text-coral'}>
                            {' → '}
                            {picked ? sideText(picked, side) : 'no answer'}
                          </span>
                          {!ok && (
                            <span className="text-[var(--oq-text-soft)]">
                              {' (correct: '}
                              {sideText(prompt, side)})
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </ReviewCard>
              )
            }

            if (question.type === 'matching') return null
            const ok = result === true
            const given = answers[question.id] ?? ''
            const shownGiven =
              question.type === 'choice'
                ? (() => {
                    const picked = question.choices.find((c) => c.id === given)
                    return picked ? sideText(picked, answerSide(question.promptSide)) : 'no answer'
                  })()
                : question.type === 'trueFalse'
                  ? given === ''
                    ? 'no answer'
                    : given === 'true'
                      ? 'True'
                      : 'False'
                  : given || 'no answer'

            return (
              <ReviewCard key={question.id} index={index} ok={ok}>
                <p className="mt-1 font-semibold">{question.prompt}</p>
                {question.type === 'trueFalse' && (
                  <p className="mt-1 text-sm text-[var(--oq-text-soft)]">{question.shown}</p>
                )}
                <p className="mt-2 text-sm">
                  <span className="text-[var(--oq-text-faint)]">You said: </span>
                  <span className={ok ? 'text-mint' : 'text-coral'}>
                    {shownGiven}
                  </span>
                </p>
                {!ok && (
                  <p className="mt-1 text-sm">
                    <span className="text-[var(--oq-text-faint)]">Correct: </span>
                    <span className="font-semibold">
                      {question.type === 'trueFalse'
                        ? question.isTrue
                          ? 'True'
                          : 'False'
                        : question.expected}
                    </span>
                  </p>
                )}
              </ReviewCard>
            )
          })}
        </AnimatePresence>
      </div>
    </div>
  )
}

function ReviewCard({
  index,
  ok,
  children,
}: {
  index: number
  ok: boolean
  children: React.ReactNode
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 8) * 0.03 }}
      className={clsx(
        'rounded-xl border-l-4 border border-[var(--oq-line)] bg-[var(--oq-surface)] px-5 py-4',
        ok ? 'border-l-mint' : 'border-l-coral',
      )}
    >
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-[var(--oq-text-faint)]">
        <span
          className={clsx(
            'grid h-5 w-5 place-items-center rounded-full text-white',
            ok ? 'bg-mint' : 'bg-coral',
          )}
        >
          {ok ? <IconCheck width={12} height={12} /> : <IconClose width={12} height={12} />}
        </span>
        Question {index + 1}
      </div>
      {children}
    </motion.div>
  )
}
