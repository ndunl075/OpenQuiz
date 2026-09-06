import { sample, shuffle } from './shuffle'
import type { Term } from './types'

export type QuestionType = 'written' | 'choice' | 'trueFalse' | 'matching'

export interface TestConfig {
  questionCount: number
  types: Record<QuestionType, boolean>
  /** Which side is shown as the prompt. */
  promptSide: 'term' | 'definition'
  starredOnly: boolean
  instantFeedback: boolean
}

export const DEFAULT_TEST_CONFIG: TestConfig = {
  questionCount: 10,
  types: { written: true, choice: true, trueFalse: true, matching: false },
  promptSide: 'term',
  starredOnly: false,
  instantFeedback: false,
}

interface Base {
  id: string
  term: Term
  prompt: string
  expected: string
  /** Which side the prompt shows, so answers render on the other side. */
  promptSide: 'term' | 'definition'
}

export interface WrittenQuestion extends Base {
  type: 'written'
}
export interface ChoiceQuestion extends Base {
  type: 'choice'
  choices: Term[]
}
export interface TrueFalseQuestion extends Base {
  type: 'trueFalse'
  /** What is shown as the proposed answer. */
  shown: string
  isTrue: boolean
}
export interface MatchingQuestion {
  type: 'matching'
  id: string
  pairs: Term[]
  prompts: Term[]
  answers: Term[]
  promptSide: 'term' | 'definition'
}

export type TestQuestion =
  | WrittenQuestion
  | ChoiceQuestion
  | TrueFalseQuestion
  | MatchingQuestion

export const MATCHING_GROUP_SIZE = 5

/** The side an answer is displayed on, given the side the prompt uses. */
export function answerSide(promptSide: 'term' | 'definition'): 'term' | 'definition' {
  return promptSide === 'term' ? 'definition' : 'term'
}

export function sideText(term: Term, side: 'term' | 'definition'): string {
  return side === 'term' ? term.term : term.definition
}

function sides(term: Term, promptSide: TestConfig['promptSide']) {
  return promptSide === 'term'
    ? { prompt: term.term, expected: term.definition }
    : { prompt: term.definition, expected: term.term }
}

/**
 * Builds an exam from a set. Question types are spread evenly across the
 * enabled kinds, and each term is used at most once so the same card never
 * appears twice in one test.
 */
export function buildTest(
  terms: readonly Term[],
  config: TestConfig,
  rng: () => number = Math.random,
): TestQuestion[] {
  const enabled = (Object.keys(config.types) as QuestionType[]).filter((t) => config.types[t])
  if (enabled.length === 0 || terms.length === 0) return []

  let pool = [...terms]
  if (config.starredOnly) {
    const starred = pool.filter((t) => t.starred)
    if (starred.length > 0) pool = starred
  }

  // Multiple choice and true/false need distractors to be meaningful.
  const usable = enabled.filter((type) => {
    if (type === 'choice') return pool.length >= 4
    if (type === 'trueFalse') return pool.length >= 2
    if (type === 'matching') return pool.length >= MATCHING_GROUP_SIZE
    return true
  })
  const kinds = usable.length > 0 ? usable : ['written' as const]

  const picked = shuffle(pool, rng).slice(0, Math.min(config.questionCount, pool.length))
  const questions: TestQuestion[] = []
  let matchingBuffer: Term[] = []

  picked.forEach((term, index) => {
    const type = kinds[index % kinds.length]
    const { prompt, expected } = sides(term, config.promptSide)
    const id = `q${index}-${term.id}`

    switch (type) {
      case 'written':
        questions.push({
          type: 'written',
          id,
          term,
          prompt,
          expected,
          promptSide: config.promptSide,
        })
        break

      case 'choice': {
        const distractors = sample(
          pool.filter((t) => t.id !== term.id),
          3,
          rng,
        )
        questions.push({
          type: 'choice',
          id,
          term,
          prompt,
          expected,
          promptSide: config.promptSide,
          choices: shuffle([term, ...distractors], rng),
        })
        break
      }

      case 'trueFalse': {
        const isTrue = rng() < 0.5
        const other = sample(
          pool.filter((t) => t.id !== term.id),
          1,
          rng,
        )[0]
        const shown = isTrue || !other ? expected : sides(other, config.promptSide).expected
        questions.push({
          type: 'trueFalse',
          id,
          term,
          prompt,
          expected,
          promptSide: config.promptSide,
          shown,
          isTrue: shown === expected,
        })
        break
      }

      case 'matching':
        matchingBuffer.push(term)
        if (matchingBuffer.length === MATCHING_GROUP_SIZE) {
          questions.push(makeMatching(matchingBuffer, config.promptSide, rng))
          matchingBuffer = []
        }
        break
    }
  })

  // A part-full matching group still becomes a question if it has enough pairs.
  if (matchingBuffer.length >= 2) {
    questions.push(makeMatching(matchingBuffer, config.promptSide, rng))
  }

  return questions
}

function makeMatching(
  pairs: Term[],
  promptSide: TestConfig['promptSide'],
  rng: () => number,
): MatchingQuestion {
  return {
    type: 'matching',
    id: `m-${pairs.map((p) => p.id).join('-')}`,
    pairs,
    prompts: shuffle(pairs, rng),
    answers: shuffle(pairs, rng),
    promptSide,
  }
}

/** How many individually gradable answers a question is worth. */
export function questionWeight(question: TestQuestion): number {
  return question.type === 'matching' ? question.pairs.length : 1
}

export function totalWeight(questions: readonly TestQuestion[]): number {
  return questions.reduce((n, q) => n + questionWeight(q), 0)
}
