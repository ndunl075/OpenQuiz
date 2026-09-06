import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Page } from '../components/layout/AppShell'
import { EmptyState, SetCard, SetCardGrid } from '../components/SetCard'
import { Button, ButtonLink, IconButton } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { Segmented } from '../components/ui/Toggle'
import { IconFolder, IconPlus, IconSearch, IconTrash } from '../components/ui/Icon'
import { useAsync } from '../hooks/useAsync'
import { createFolder, deleteFolder, listFolders, listSets } from '../store/sets'
import { pluralize } from '../lib/format'

type Tab = 'sets' | 'folders'

export default function Library() {
  const [params, setParams] = useSearchParams()
  const [tab, setTab] = useState<Tab>('sets')
  const [newFolder, setNewFolder] = useState('')
  const [folderModal, setFolderModal] = useState(false)

  const query = params.get('q') ?? ''
  const { value: sets = [], loading } = useAsync(listSets, [])
  const { value: folders = [], refresh: refreshFolders } = useAsync(listFolders, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return sets
    return sets.filter(
      (set) =>
        set.title.toLowerCase().includes(q) ||
        set.description.toLowerCase().includes(q) ||
        set.terms.some(
          (t) => t.term.toLowerCase().includes(q) || t.definition.toLowerCase().includes(q),
        ),
    )
  }, [sets, query])

  const folderName = (id?: string) => folders.find((f) => f.id === id)?.name

  const addFolder = async () => {
    if (!newFolder.trim()) return
    await createFolder(newFolder)
    setNewFolder('')
    setFolderModal(false)
    refreshFolders()
  }

  return (
    <Page width="max-w-[1200px]">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-extrabold">Your library</h1>
        <ButtonLink to="/create" icon={<IconPlus width={16} height={16} />} size="sm">
          New set
        </ButtonLink>
      </header>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: 'sets', label: `Sets${sets.length ? ` (${sets.length})` : ''}` },
            { value: 'folders', label: `Folders${folders.length ? ` (${folders.length})` : ''}` },
          ]}
        />
        {tab === 'sets' && (
          <div className="relative min-w-0 flex-1 sm:max-w-sm">
            <IconSearch className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--oq-text-faint)]" />
            <Input
              value={query}
              onChange={(e) => setParams(e.target.value ? { q: e.target.value } : {})}
              placeholder="Filter by title, term or definition"
              aria-label="Filter sets"
              className="!py-2.5 pl-11"
            />
          </div>
        )}
        {tab === 'folders' && (
          <Button variant="secondary" size="sm" onClick={() => setFolderModal(true)}>
            New folder
          </Button>
        )}
      </div>

      <div className="mt-8">
        {tab === 'sets' &&
          (loading ? null : filtered.length === 0 ? (
            <EmptyState
              title={query ? 'No sets match that search' : 'Your library is empty'}
              body={
                query
                  ? 'Try a different word, or clear the filter.'
                  : 'Create a set to start studying. Everything you make stays on this device.'
              }
              action={
                query ? (
                  <Button variant="secondary" onClick={() => setParams({})}>
                    Clear filter
                  </Button>
                ) : (
                  <ButtonLink to="/create">Create a set</ButtonLink>
                )
              }
            />
          ) : (
            <SetCardGrid>
              {filtered.map((set) => (
                <SetCard key={set.id} set={set} folderName={folderName(set.folderId)} />
              ))}
            </SetCardGrid>
          ))}

        {tab === 'folders' &&
          (folders.length === 0 ? (
            <EmptyState
              title="No folders yet"
              body="Folders group related sets together — a class, a language, an exam."
              action={<Button onClick={() => setFolderModal(true)}>New folder</Button>}
            />
          ) : (
            <ul className="space-y-3">
              {folders.map((folder) => {
                const owned = sets.filter((s) => s.folderId === folder.id)
                return (
                  <li
                    key={folder.id}
                    className="flex items-center gap-4 rounded-xl border border-[var(--oq-line)] bg-[var(--oq-surface)] px-5 py-4"
                  >
                    <IconFolder className="text-indigo-oq" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold">{folder.name}</p>
                      <p className="text-xs text-[var(--oq-text-faint)]">
                        {pluralize(owned.length, 'set')}
                      </p>
                    </div>
                    <IconButton
                      label={`Delete folder ${folder.name}`}
                      onClick={async () => {
                        await deleteFolder(folder.id)
                        refreshFolders()
                      }}
                    >
                      <IconTrash width={18} height={18} />
                    </IconButton>
                  </li>
                )
              })}
            </ul>
          ))}
      </div>

      <Modal
        open={folderModal}
        onClose={() => setFolderModal(false)}
        title="New folder"
        footer={
          <>
            <Button variant="ghost" onClick={() => setFolderModal(false)}>
              Cancel
            </Button>
            <Button onClick={addFolder} disabled={!newFolder.trim()}>
              Create
            </Button>
          </>
        }
      >
        <Input
          autoFocus
          value={newFolder}
          onChange={(e) => setNewFolder(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addFolder()}
          placeholder="Folder name"
          aria-label="Folder name"
        />
      </Modal>
    </Page>
  )
}
