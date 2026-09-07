import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Page } from '../components/layout/AppShell'
import { ModeTiles } from '../components/ModeTiles'
import { Button, ButtonLink, IconButton } from '../components/ui/Button'
import { Menu } from '../components/ui/Menu'
import { Modal } from '../components/ui/Modal'
import { ShareModal } from '../components/ShareModal'
import { ProgressBar } from '../components/ui/Progress'
import { Segmented } from '../components/ui/Toggle'
import {
  IconEdit,
  IconMore,
  IconShare,
  IconSound,
  IconStar,
  IconTrash,
} from '../components/ui/Icon'
import NotFound from './NotFound'
import { useAsync } from '../hooks/useAsync'
import { deleteSet, duplicateSet, getSet, listFolders, moveSetToFolder, toggleStar } from '../store/sets'
import { loadProgress, resetProgress } from '../store/progress'
import { tallyMastery } from '../lib/scheduler'
import { download, slugify, toCsv, toExport } from '../lib/exportSet'
import { pluralize } from '../lib/format'
import { speak } from '../lib/tts'

type Filter = 'all' | 'starred'

export default function SetDetail() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [filter, setFilter] = useState<Filter>('all')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)

  const { value: set, loading, refresh } = useAsync(() => getSet(id), [id])
  const { value: progress, refresh: refreshProgress } = useAsync(() => loadProgress(id), [id])
  const { value: folders = [] } = useAsync(listFolders, [])

  const mastery = useMemo(
    () => tallyMastery(set?.terms ?? [], progress ?? new Map()),
    [set, progress],
  )

  const visibleTerms = useMemo(() => {
    if (!set) return []
    return filter === 'starred' ? set.terms.filter((t) => t.starred) : set.terms
  }, [set, filter])

  if (loading) return <Page />
  if (!set) return <NotFound />

  const starredCount = set.terms.filter((t) => t.starred).length

  return (
    <Page width="max-w-[1100px]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl font-extrabold leading-tight">{set.title}</h1>
          {set.description && (
            <p className="mt-2 max-w-2xl text-sm text-[var(--oq-text-soft)]">{set.description}</p>
          )}
          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-[var(--oq-text-faint)]">
            {pluralize(set.terms.length, 'term')}
            {starredCount > 0 && ` · ${starredCount} starred`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <IconButton label="Edit set" onClick={() => navigate(`/set/${set.id}/edit`)}>
            <IconEdit />
          </IconButton>
          <Menu
            align="right"
            trigger={({ toggle }) => (
              <IconButton label="More options" onClick={toggle}>
                <IconMore />
              </IconButton>
            )}
            items={[
              {
                label: 'Share as a link',
                icon: <IconShare width={16} height={16} />,
                onSelect: () => setShareOpen(true),
              },
              {
                label: 'Export as JSON',
                icon: <IconShare width={16} height={16} />,
                onSelect: () =>
                  download(`${slugify(set.title)}.json`, JSON.stringify(toExport(set), null, 2)),
              },
              {
                label: 'Export as CSV',
                icon: <IconShare width={16} height={16} />,
                onSelect: () => download(`${slugify(set.title)}.csv`, toCsv(set), 'text/csv'),
              },
              {
                label: 'Duplicate set',
                onSelect: async () => {
                  const copy = await duplicateSet(set.id)
                  if (copy) navigate(`/set/${copy.id}`)
                },
              },
              {
                label: 'Reset progress',
                onSelect: async () => {
                  await resetProgress(set.id)
                  refreshProgress()
                },
              },
              {
                label: 'Delete set',
                icon: <IconTrash width={16} height={16} />,
                danger: true,
                onSelect: () => setConfirmDelete(true),
              },
            ]}
          />
        </div>
      </div>

      {mastery.total > 0 && mastery.percent > 0 && (
        <div className="mt-6 rounded-xl border border-[var(--oq-line)] bg-[var(--oq-surface)] px-5 py-4">
          <div className="flex items-center justify-between text-sm font-semibold">
            <span>{mastery.mastered} mastered</span>
            <span className="text-[var(--oq-text-faint)]">{mastery.remaining} to go</span>
          </div>
          <ProgressBar className="mt-2.5" value={mastery.percent} color="var(--color-mint)" />
        </div>
      )}

      <section className="mt-8">
        <h2 className="sr-only">Study modes</h2>
        <ModeTiles setId={set.id} />
      </section>

      <section className="mt-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold">Terms in this set</h2>
          {starredCount > 0 && (
            <Segmented
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'all', label: 'All' },
                { value: 'starred', label: `Starred (${starredCount})` },
              ]}
            />
          )}
        </div>

        <ul className="mt-4 space-y-3">
          {visibleTerms.map((term) => (
            <li
              key={term.id}
              className="grid grid-cols-[1fr_auto] items-center gap-4 rounded-xl border border-[var(--oq-line)] bg-[var(--oq-surface)] px-5 py-4 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)_auto]"
            >
              <span className="font-semibold">{term.term}</span>
              <span className="col-span-2 border-l-0 text-sm text-[var(--oq-text-soft)] sm:col-span-1 sm:border-l sm:border-[var(--oq-line)] sm:pl-5">
                {term.definition}
              </span>
              <span className="flex items-center gap-1 justify-self-end">
                <IconButton
                  label={`Listen to ${term.term}`}
                  size="sm"
                  onClick={() => speak(term.term, set.termLang)}
                >
                  <IconSound width={16} height={16} />
                </IconButton>
                <IconButton
                  label={term.starred ? `Unstar ${term.term}` : `Star ${term.term}`}
                  size="sm"
                  active={term.starred}
                  onClick={async () => {
                    await toggleStar(set.id, term.id)
                    refresh()
                  }}
                >
                  <IconStar width={16} height={16} filled={term.starred} />
                </IconButton>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10 flex flex-wrap items-center gap-3 border-t border-[var(--oq-line)] pt-6">
        <label className="text-xs font-semibold text-[var(--oq-text-faint)]">
          Folder
          <select
            value={set.folderId ?? ''}
            onChange={async (e) => {
              await moveSetToFolder(set.id, e.target.value || undefined)
              refresh()
            }}
            className="ml-2 rounded-md border border-[var(--oq-line)] bg-[var(--oq-surface)] px-2 py-1 text-base font-semibold text-[var(--oq-text)] pointer-fine:text-xs"
          >
            <option value="">No folder</option>
            {folders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.name}
              </option>
            ))}
          </select>
        </label>
        <ButtonLink to={`/set/${set.id}/edit`} variant="ghost" size="sm">
          Edit this set
        </ButtonLink>
      </section>

      <ShareModal set={set} open={shareOpen} onClose={() => setShareOpen(false)} />

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete this set?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                await deleteSet(set.id)
                navigate('/library')
              }}
            >
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-[var(--oq-text-soft)]">
          “{set.title}” and its progress will be removed from this device. This cannot be undone —
          export it first if you want a copy.
        </p>
      </Modal>
    </Page>
  )
}
