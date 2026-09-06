import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion, Reorder } from 'motion/react'
import { Page } from '../components/layout/AppShell'
import { Button, IconButton } from '../components/ui/Button'
import { IconClose, IconPlus, IconShuffle, IconTrash } from '../components/ui/Icon'
import { Textarea, UnderlineInput } from '../components/ui/Input'
import { ImportModal } from '../components/ImportModal'
import { blankSet, blankTerm, getSet, saveSet } from '../store/sets'
import { LANGUAGES } from '../lib/tts'
import type { StudySet, Term } from '../lib/types'

function LanguageSelect({
  value,
  onChange,
  label,
}: {
  value: string
  onChange: (value: string) => void
  label: string
}) {
  return (
    <label className="flex items-center gap-2 text-xs font-semibold text-[var(--oq-text-faint)]">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-[var(--oq-line)] bg-[var(--oq-surface)] px-2 py-1 text-xs font-semibold text-[var(--oq-text)]"
      >
        {LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.label}
          </option>
        ))}
      </select>
    </label>
  )
}

export default function EditSet() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [set, setSet] = useState<StudySet | null>(() => (id ? null : blankSet()))
  const [importOpen, setImportOpen] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    void getSet(id).then((found) => setSet(found ?? blankSet()))
  }, [id])

  const filledCount = useMemo(
    () => set?.terms.filter((t) => t.term.trim() && t.definition.trim()).length ?? 0,
    [set],
  )

  if (!set) return <Page />

  const patch = (changes: Partial<StudySet>) => setSet({ ...set, ...changes })

  const patchTerm = (termId: string, changes: Partial<Term>) =>
    patch({ terms: set.terms.map((t) => (t.id === termId ? { ...t, ...changes } : t)) })

  const removeTerm = (termId: string) =>
    patch({ terms: set.terms.filter((t) => t.id !== termId) })

  const addTerm = () => patch({ terms: [...set.terms, blankTerm()] })

  const submit = async () => {
    if (!set.title.trim()) {
      setError('Give your set a title.')
      return
    }
    if (filledCount < 2) {
      setError('Add at least two terms with both a term and a definition.')
      return
    }
    const saved = await saveSet(set)
    navigate(`/set/${saved.id}`)
  }

  return (
    <Page width="max-w-[1100px]">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-extrabold">
          {id ? 'Edit set' : 'Create a new study set'}
        </h1>
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={() => setImportOpen(true)}>
            Import
          </Button>
          <Button onClick={submit}>{id ? 'Done' : 'Create'}</Button>
        </div>
      </header>

      <div className="mt-8 space-y-5">
        <UnderlineInput
          value={set.title}
          onChange={(e) => patch({ title: e.target.value })}
          placeholder='Subject, chapter, unit'
          caption="Title"
          aria-label="Set title"
        />
        <Textarea
          rows={2}
          value={set.description}
          onChange={(e) => patch({ description: e.target.value })}
          placeholder="Add a description..."
          aria-label="Set description"
        />
        <div className="flex flex-wrap gap-6">
          <LanguageSelect
            label="Term language"
            value={set.termLang}
            onChange={(termLang) => patch({ termLang })}
          />
          <LanguageSelect
            label="Definition language"
            value={set.defLang}
            onChange={(defLang) => patch({ defLang })}
          />
          <button
            type="button"
            onClick={() => patch({ terms: [...set.terms].reverse() })}
            className="flex items-center gap-1.5 text-xs font-semibold text-indigo-oq"
          >
            <IconShuffle width={14} height={14} /> Reverse order
          </button>
        </div>
      </div>

      <Reorder.Group
        axis="y"
        values={set.terms}
        onReorder={(terms) => patch({ terms })}
        className="mt-8 space-y-3"
      >
        <AnimatePresence initial={false}>
          {set.terms.map((term, index) => (
            <Reorder.Item
              key={term.id}
              value={term}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              transition={{ duration: 0.18 }}
              className="rounded-xl border border-[var(--oq-line)] bg-[var(--oq-surface)]"
            >
              <div className="flex items-center justify-between border-b border-[var(--oq-line)] px-5 py-2.5">
                <span className="cursor-grab text-sm font-bold text-[var(--oq-text-faint)] active:cursor-grabbing">
                  {index + 1}
                </span>
                <IconButton
                  label={`Remove term ${index + 1}`}
                  size="sm"
                  onClick={() => removeTerm(term.id)}
                  disabled={set.terms.length <= 1}
                >
                  <IconTrash width={16} height={16} />
                </IconButton>
              </div>
              <div className="grid gap-6 px-5 py-4 sm:grid-cols-2">
                <UnderlineInput
                  value={term.term}
                  onChange={(e) => patchTerm(term.id, { term: e.target.value })}
                  caption="Term"
                  placeholder="Enter term"
                  aria-label={`Term ${index + 1}`}
                />
                <UnderlineInput
                  value={term.definition}
                  onChange={(e) => patchTerm(term.id, { definition: e.target.value })}
                  caption="Definition"
                  placeholder="Enter definition"
                  aria-label={`Definition ${index + 1}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && index === set.terms.length - 1) addTerm()
                  }}
                />
              </div>
            </Reorder.Item>
          ))}
        </AnimatePresence>
      </Reorder.Group>

      <motion.button
        type="button"
        onClick={addTerm}
        whileTap={{ scale: 0.99 }}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--oq-line)] py-6 text-sm font-bold text-[var(--oq-text-soft)] transition-colors hover:border-indigo-oq hover:text-indigo-oq"
      >
        <IconPlus width={18} height={18} /> Add a card
      </motion.button>

      {error && (
        <div
          role="alert"
          className="mt-6 flex items-center justify-between gap-3 rounded-lg bg-coral-soft px-4 py-3 text-sm font-semibold text-[#a63a28]"
        >
          {error}
          <IconButton label="Dismiss" size="sm" onClick={() => setError('')}>
            <IconClose width={16} height={16} />
          </IconButton>
        </div>
      )}

      <div className="mt-8 flex justify-end">
        <Button size="lg" onClick={submit}>
          {id ? 'Save changes' : 'Create set'}
        </Button>
      </div>

      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={(terms) =>
          patch({
            terms: [...set.terms.filter((t) => t.term.trim() || t.definition.trim()), ...terms],
          })
        }
      />
    </Page>
  )
}
