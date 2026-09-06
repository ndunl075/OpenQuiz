import { newId } from './id'
import type { Term } from './types'

export type TermSeparator = 'tab' | 'comma' | 'dash' | 'custom'
export type RowSeparator = 'newline' | 'semicolon' | 'blankline' | 'custom'

export interface ImportOptions {
  termSeparator: TermSeparator
  rowSeparator: RowSeparator
  customTerm?: string
  customRow?: string
}

export const DEFAULT_IMPORT_OPTIONS: ImportOptions = {
  termSeparator: 'tab',
  rowSeparator: 'newline',
}

function termDelimiter(o: ImportOptions): string {
  switch (o.termSeparator) {
    case 'tab':
      return '\t'
    case 'comma':
      return ','
    case 'dash':
      return '-'
    case 'custom':
      return o.customTerm || '\t'
  }
}

function rowDelimiter(o: ImportOptions): string {
  switch (o.rowSeparator) {
    case 'newline':
      return '\n'
    case 'semicolon':
      return ';'
    case 'blankline':
      return '\n\n'
    case 'custom':
      return o.customRow || '\n'
  }
}

/**
 * Parse pasted text into terms. Splits on the row delimiter, then on the
 * first occurrence of the term delimiter so definitions may contain it.
 */
export function parseImport(text: string, options: ImportOptions = DEFAULT_IMPORT_OPTIONS): Term[] {
  const rowDelim = rowDelimiter(options)
  const termDelim = termDelimiter(options)
  if (!text.trim()) return []

  const rows =
    rowDelim === '\n\n'
      ? text.split(/\n\s*\n/)
      : text.split(rowDelim === '\n' ? /\r?\n/ : rowDelim)

  const out: Term[] = []
  for (const raw of rows) {
    const row = raw.replace(/\r/g, '').trim()
    if (!row) continue
    const at = row.indexOf(termDelim)
    const term = (at === -1 ? row : row.slice(0, at)).trim()
    const definition = (at === -1 ? '' : row.slice(at + termDelim.length)).trim()
    if (!term && !definition) continue
    out.push({ id: newId(), term, definition, starred: false })
  }
  return out
}

/** Round-trips through `parseImport` with tab/newline defaults. */
export function toImportText(terms: readonly Term[]): string {
  return terms.map((t) => `${t.term}\t${t.definition}`).join('\n')
}
