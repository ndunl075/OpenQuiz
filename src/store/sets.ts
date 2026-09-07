import { db } from '../lib/db'
import { newId } from '../lib/id'
import { requestPersistentStorage } from '../lib/storage'
import { scheduleBackup } from '../lib/folderBackup'
import type { Folder, SetId, StudySet, Term, TermId } from '../lib/types'

export function blankTerm(): Term {
  return { id: newId(), term: '', definition: '', starred: false }
}

export function blankSet(): StudySet {
  const now = Date.now()
  return {
    id: newId(),
    title: '',
    description: '',
    terms: [blankTerm(), blankTerm(), blankTerm(), blankTerm()],
    termLang: 'en-US',
    defLang: 'en-US',
    createdAt: now,
    updatedAt: now,
  }
}

export async function listSets(): Promise<StudySet[]> {
  const sets = await db.sets.toArray()
  return sets.sort((a, b) => b.updatedAt - a.updatedAt)
}

export function getSet(id: SetId): Promise<StudySet | undefined> {
  return db.sets.get(id)
}

export async function saveSet(set: StudySet): Promise<StudySet> {
  const clean: StudySet = {
    ...set,
    title: set.title.trim() || 'Untitled set',
    terms: set.terms.filter((t) => t.term.trim() || t.definition.trim()),
    updatedAt: Date.now(),
  }
  await db.sets.put(clean)
  // There is now data worth keeping, so ask the browser not to evict it. Asked
  // here rather than on load so a first-time visitor is never prompted for
  // storage they have not used yet. Declining is fine; the set is still saved.
  void requestPersistentStorage()
  scheduleBackup()
  return clean
}

export async function deleteSet(id: SetId): Promise<void> {
  await db.transaction('rw', db.sets, db.progress, db.modeStats, async () => {
    await db.sets.delete(id)
    await db.progress.where('setId').equals(id).delete()
    await db.modeStats.where('setId').equals(id).delete()
  })
  scheduleBackup()
}

export async function duplicateSet(id: SetId): Promise<StudySet | undefined> {
  const original = await getSet(id)
  if (!original) return undefined
  const now = Date.now()
  const copy: StudySet = {
    ...original,
    id: newId(),
    title: `${original.title} (copy)`,
    terms: original.terms.map((t) => ({ ...t, id: newId() })),
    createdAt: now,
    updatedAt: now,
  }
  await db.sets.put(copy)
  return copy
}

export async function toggleStar(setId: SetId, termId: TermId): Promise<void> {
  const set = await getSet(setId)
  if (!set) return
  const terms = set.terms.map((t) => (t.id === termId ? { ...t, starred: !t.starred } : t))
  await db.sets.put({ ...set, terms, updatedAt: Date.now() })
}

export async function listFolders(): Promise<Folder[]> {
  const folders = await db.folders.toArray()
  return folders.sort((a, b) => a.name.localeCompare(b.name))
}

export async function createFolder(name: string): Promise<Folder> {
  const folder: Folder = { id: newId(), name: name.trim() || 'New folder', createdAt: Date.now() }
  await db.folders.put(folder)
  return folder
}

export async function renameFolder(id: string, name: string): Promise<void> {
  await db.folders.update(id, { name: name.trim() || 'New folder' })
}

export async function deleteFolder(id: string): Promise<void> {
  await db.transaction('rw', db.folders, db.sets, async () => {
    await db.folders.delete(id)
    const owned = await db.sets.where('folderId').equals(id).toArray()
    await Promise.all(owned.map((s) => db.sets.put({ ...s, folderId: undefined })))
  })
}

export async function moveSetToFolder(setId: SetId, folderId?: string): Promise<void> {
  const set = await getSet(setId)
  if (!set) return
  await db.sets.put({ ...set, folderId, updatedAt: Date.now() })
}
