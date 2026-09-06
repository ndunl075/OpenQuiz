export type Grade = 'correct' | 'typo' | 'incorrect'

const ARTICLES = /^(a|an|the|el|la|los|las|le|les|un|una|der|die|das|il|lo)\s+/i
const PUNCTUATION = /[.,/#!$%^&*;:{}=\-_`~()"'?¿¡!·。、，；：]/g

/** Case, accent, punctuation and whitespace insensitive form of an answer. */
export function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(PUNCTUATION, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Drop a leading article: "the mitochondria" -> "mitochondria". */
function stripArticle(value: string): string {
  return value.replace(ARTICLES, '').trim()
}

/**
 * Split an accepted answer into the alternatives a user may type.
 * "cat/kitty (feline)" accepts "cat", "kitty", "feline" and the whole string.
 */
export function acceptedAnswers(expected: string): string[] {
  const out = new Set<string>()
  const add = (v: string) => {
    const n = normalize(v)
    if (n) {
      out.add(n)
      out.add(stripArticle(n))
    }
  }

  add(expected)

  // Parenthesised and bracketed hints are optional, and also valid alone.
  const withoutParens = expected.replace(/[([{][^)\]}]*[)\]}]/g, ' ')
  add(withoutParens)
  for (const m of expected.matchAll(/[([{]([^)\]}]*)[)\]}]/g)) add(m[1])

  // Slash / comma / semicolon separated alternatives.
  for (const part of withoutParens.split(/[/;,]|\bor\b/i)) add(part)

  return [...out].filter(Boolean)
}

/** Levenshtein distance, capped for early exit. */
export function levenshtein(a: string, b: string, max = Infinity): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  if (Math.abs(a.length - b.length) > max) return max + 1

  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const curr = [i]
    let rowMin = i
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost)
      rowMin = Math.min(rowMin, curr[j])
    }
    if (rowMin > max) return max + 1
    prev = curr
  }
  return prev[b.length]
}

/** How many single-character mistakes are forgiven for a given length. */
function typoBudget(length: number): number {
  if (length <= 3) return 0
  if (length <= 6) return 1
  if (length <= 12) return 2
  return 3
}

/**
 * The single source of truth for "did they get it right?".
 * Every study mode calls this so grading never drifts between modes.
 */
export function grade(input: string, expected: string, allowTypos = true): Grade {
  const typed = normalize(input)
  if (!typed) return 'incorrect'
  if (input.trim() === expected.trim()) return 'correct'

  const candidates = acceptedAnswers(expected)
  if (candidates.includes(typed) || candidates.includes(stripArticle(typed))) return 'correct'

  if (!allowTypos) return 'incorrect'

  const bare = stripArticle(typed)
  for (const candidate of candidates) {
    const budget = typoBudget(candidate.length)
    if (budget === 0) continue
    if (levenshtein(bare, candidate, budget) <= budget) return 'typo'
  }
  return 'incorrect'
}

/** Character-level diff used by Spell to highlight where it went wrong. */
export interface DiffChar {
  char: string
  ok: boolean
}

export function diffChars(input: string, expected: string): DiffChar[] {
  const out: DiffChar[] = []
  for (let i = 0; i < input.length; i++) {
    out.push({ char: input[i], ok: normalize(input[i]) === normalize(expected[i] ?? '') })
  }
  return out
}
