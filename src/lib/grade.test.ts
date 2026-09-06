import { describe, expect, it } from 'vitest'
import { acceptedAnswers, diffChars, grade, levenshtein, normalize } from './grade'

describe('normalize', () => {
  it('strips case, accents, punctuation and extra whitespace', () => {
    expect(normalize('  Él  Niño!! ')).toBe('el nino')
    expect(normalize('photo-synthesis')).toBe('photo synthesis')
  })
})

describe('levenshtein', () => {
  it('measures edit distance', () => {
    expect(levenshtein('kitten', 'sitting')).toBe(3)
    expect(levenshtein('same', 'same')).toBe(0)
  })
  it('exits early past the cap', () => {
    expect(levenshtein('abcdefgh', 'zzz', 2)).toBeGreaterThan(2)
  })
})

describe('acceptedAnswers', () => {
  it('accepts slash and parenthesis alternatives', () => {
    const answers = acceptedAnswers('cat/kitty (feline)')
    expect(answers).toContain('cat')
    expect(answers).toContain('kitty')
    expect(answers).toContain('feline')
  })
})

describe('grade', () => {
  it('accepts exact and normalized matches', () => {
    expect(grade('Mitochondria', 'mitochondria')).toBe('correct')
    expect(grade('the mitochondria', 'mitochondria')).toBe('correct')
    expect(grade('el niño', 'El Niño')).toBe('correct')
  })

  it('accepts any listed alternative', () => {
    expect(grade('kitty', 'cat/kitty')).toBe('correct')
    expect(grade('feline', 'cat (feline)')).toBe('correct')
  })

  it('flags near misses as typos rather than failing them', () => {
    expect(grade('mitochondira', 'mitochondria')).toBe('typo')
    expect(grade('photosynthsis', 'photosynthesis')).toBe('typo')
  })

  it('rejects wrong answers', () => {
    expect(grade('chloroplast', 'mitochondria')).toBe('incorrect')
    expect(grade('', 'mitochondria')).toBe('incorrect')
  })

  it('does not forgive typos on very short answers', () => {
    expect(grade('cot', 'cat')).toBe('incorrect')
  })

  it('can run with typo tolerance disabled', () => {
    expect(grade('mitochondira', 'mitochondria', false)).toBe('incorrect')
  })
})

describe('diffChars', () => {
  it('marks the first wrong character', () => {
    const diff = diffChars('helo', 'hello')
    expect(diff.map((d) => d.ok)).toEqual([true, true, true, false])
  })
})
