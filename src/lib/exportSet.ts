import type { StudySet, Term } from './types'

export interface SetExport {
  format: 'openquiz-set'
  version: 1
  title: string
  description: string
  termLang: string
  defLang: string
  terms: Array<Pick<Term, 'term' | 'definition' | 'starred'>>
}

export function toExport(set: StudySet): SetExport {
  return {
    format: 'openquiz-set',
    version: 1,
    title: set.title,
    description: set.description,
    termLang: set.termLang,
    defLang: set.defLang,
    terms: set.terms.map((t) => ({
      term: t.term,
      definition: t.definition,
      starred: t.starred,
    })),
  }
}

function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

export function toCsv(set: StudySet): string {
  const rows = [['term', 'definition', 'starred'].join(',')]
  for (const t of set.terms) {
    rows.push([csvCell(t.term), csvCell(t.definition), String(t.starred)].join(','))
  }
  return rows.join('\n')
}

export function download(filename: string, content: string, mime = 'application/json') {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.append(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'openquiz-set'
  )
}
