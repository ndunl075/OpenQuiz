import { useMemo, useState } from 'react'
import { Button } from './ui/Button'
import { Modal } from './ui/Modal'
import { Input, Textarea } from './ui/Input'
import {
  DEFAULT_IMPORT_OPTIONS,
  parseImport,
  type ImportOptions,
  type RowSeparator,
  type TermSeparator,
} from '../lib/parseImport'
import type { Term } from '../lib/types'
import { pluralize } from '../lib/format'

const TERM_CHOICES: Array<{ value: TermSeparator; label: string }> = [
  { value: 'tab', label: 'Tab' },
  { value: 'comma', label: 'Comma' },
  { value: 'dash', label: 'Dash' },
  { value: 'custom', label: 'Custom' },
]

const ROW_CHOICES: Array<{ value: RowSeparator; label: string }> = [
  { value: 'newline', label: 'New line' },
  { value: 'blankline', label: 'Blank line' },
  { value: 'semicolon', label: 'Semicolon' },
  { value: 'custom', label: 'Custom' },
]

function Radios<T extends string>({
  legend,
  value,
  choices,
  onChange,
}: {
  legend: string
  value: T
  choices: Array<{ value: T; label: string }>
  onChange: (value: T) => void
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[var(--oq-text-faint)]">
        {legend}
      </legend>
      <div className="flex flex-wrap gap-2">
        {choices.map((choice) => (
          <button
            key={choice.value}
            type="button"
            onClick={() => onChange(choice.value)}
            aria-pressed={value === choice.value}
            className={
              'touch-target rounded-lg border px-3 py-1.5 text-[13px] font-semibold transition-colors active:bg-[var(--oq-surface-2)] ' +
              (value === choice.value
                ? 'border-indigo-oq bg-indigo-soft text-indigo-oq'
                : 'border-[var(--oq-line)] text-[var(--oq-text-soft)] hover:text-[var(--oq-text)]')
            }
          >
            {choice.label}
          </button>
        ))}
      </div>
    </fieldset>
  )
}

export function ImportModal({
  open,
  onClose,
  onImport,
}: {
  open: boolean
  onClose: () => void
  onImport: (terms: Term[]) => void
}) {
  const [text, setText] = useState('')
  const [options, setOptions] = useState<ImportOptions>(DEFAULT_IMPORT_OPTIONS)

  const preview = useMemo(() => parseImport(text, options), [text, options])

  const commit = () => {
    if (preview.length === 0) return
    onImport(preview)
    setText('')
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Import terms"
      width="max-w-2xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={commit} disabled={preview.length === 0}>
            Import {preview.length > 0 ? pluralize(preview.length, 'term') : 'terms'}
          </Button>
        </>
      }
    >
      <p className="mb-3 text-sm text-[var(--oq-text-soft)]">
        Paste your data below. Copying straight out of a spreadsheet already uses tabs and new
        lines.
      </p>
      <Textarea
        rows={7}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={'Word 1\tDefinition 1\nWord 2\tDefinition 2'}
        aria-label="Terms to import"
        className="font-mono"
      />

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <div className="space-y-3">
          <Radios
            legend="Between term and definition"
            value={options.termSeparator}
            choices={TERM_CHOICES}
            onChange={(termSeparator) => setOptions((o) => ({ ...o, termSeparator }))}
          />
          {options.termSeparator === 'custom' && (
            <Input
              value={options.customTerm ?? ''}
              onChange={(e) => setOptions((o) => ({ ...o, customTerm: e.target.value }))}
              placeholder="e.g. ::"
              aria-label="Custom term separator"
            />
          )}
        </div>
        <div className="space-y-3">
          <Radios
            legend="Between rows"
            value={options.rowSeparator}
            choices={ROW_CHOICES}
            onChange={(rowSeparator) => setOptions((o) => ({ ...o, rowSeparator }))}
          />
          {options.rowSeparator === 'custom' && (
            <Input
              value={options.customRow ?? ''}
              onChange={(e) => setOptions((o) => ({ ...o, customRow: e.target.value }))}
              placeholder="e.g. |"
              aria-label="Custom row separator"
            />
          )}
        </div>
      </div>

      {preview.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[var(--oq-text-faint)]">
            Preview
          </p>
          <div className="rounded-lg border border-[var(--oq-line)]">
            {preview.slice(0, 40).map((term, i) => (
              <div
                key={term.id}
                className={
                  'grid grid-cols-2 gap-4 px-4 py-2.5 text-sm ' +
                  (i % 2 ? 'bg-[var(--oq-bg)]' : '')
                }
              >
                <span className="truncate font-semibold">{term.term || '—'}</span>
                <span className="truncate text-[var(--oq-text-soft)]">{term.definition || '—'}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  )
}
