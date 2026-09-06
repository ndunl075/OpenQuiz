import { describe, expect, it } from 'vitest'
import { parseImport, toImportText } from './parseImport'

describe('parseImport', () => {
  it('parses tab-separated rows by default', () => {
    const terms = parseImport('cat\tfeline\ndog\tcanine')
    expect(terms.map((t) => [t.term, t.definition])).toEqual([
      ['cat', 'feline'],
      ['dog', 'canine'],
    ])
  })

  it('splits on the first delimiter only so definitions may contain it', () => {
    const [only] = parseImport('cat,a small, furry animal', {
      termSeparator: 'comma',
      rowSeparator: 'newline',
    })
    expect(only.term).toBe('cat')
    expect(only.definition).toBe('a small, furry animal')
  })

  it('supports custom separators and blank-line rows', () => {
    const terms = parseImport('cat::feline\n\ndog::canine', {
      termSeparator: 'custom',
      customTerm: '::',
      rowSeparator: 'blankline',
    })
    expect(terms).toHaveLength(2)
    expect(terms[1].definition).toBe('canine')
  })

  it('skips empty rows and returns nothing for blank input', () => {
    expect(parseImport('\n\n  \n')).toEqual([])
    expect(parseImport('cat\tfeline\n\n\ndog\tcanine')).toHaveLength(2)
  })

  it('keeps a term with no definition', () => {
    const [only] = parseImport('lonely')
    expect(only.term).toBe('lonely')
    expect(only.definition).toBe('')
  })

  it('round-trips through toImportText', () => {
    const terms = parseImport('cat\tfeline\ndog\tcanine')
    expect(parseImport(toImportText(terms)).map((t) => t.term)).toEqual(['cat', 'dog'])
  })
})
