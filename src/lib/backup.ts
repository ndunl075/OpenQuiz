import { db } from './db'
import { newId } from './id'
import type { Folder, ModeStats, Progress, StudySet, Term } from './types'
import type { SetExport } from './exportSet'

export interface LibraryBackup {
  format: 'openquiz-library'
  version: 1
  exportedAt: number
  sets: StudySet[]
  folders: Folder[]
  progress: Progress[]
  modeStats: ModeStats[]
}

export async function exportLibrary(): Promise<LibraryBackup> {
  const [sets, folders, progress, modeStats] = await Promise.all([
    db.sets.toArray(),
    db.folders.toArray(),
    db.progress.toArray(),
    db.modeStats.toArray(),
  ])
  return {
    format: 'openquiz-library',
    version: 1,
    exportedAt: Date.now(),
    sets,
    folders,
    progress,
    modeStats,
  }
}

export type ImportResult =
  | { ok: true; sets: number; kind: 'library' | 'set' }
  | { ok: false; error: string }

function isTermish(value: unknown): value is Term {
  if (typeof value !== 'object' || value === null) return false
  const term = value as Record<string, unknown>
  return typeof term.term === 'string' && typeof term.definition === 'string'
}

function normalizeTerms(raw: unknown): Term[] {
  if (!Array.isArray(raw)) return []
  return raw.filter(isTermish).map((term) => ({
    id: typeof term.id === 'string' ? term.id : newId(),
    term: term.term,
    definition: term.definition,
    starred: Boolean(term.starred),
    image: typeof term.image === 'string' ? term.image : undefined,
  }))
}

function normalizeSet(raw: Record<string, unknown>): StudySet | null {
  const terms = normalizeTerms(raw.terms)
  if (terms.length === 0) return null
  const now = Date.now()
  return {
    id: typeof raw.id === 'string' ? raw.id : newId(),
    title: typeof raw.title === 'string' && raw.title.trim() ? raw.title : 'Imported set',
    description: typeof raw.description === 'string' ? raw.description : '',
    terms,
    folderId: typeof raw.folderId === 'string' ? raw.folderId : undefined,
    termLang: typeof raw.termLang === 'string' ? raw.termLang : 'en-US',
    defLang: typeof raw.defLang === 'string' ? raw.defLang : 'en-US',
    createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : now,
    updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : now,
  }
}

/**
 * Restores a whole-library backup or a single exported set. Unknown shapes
 * are rejected with a message rather than being written half-parsed.
 */
export async function importBackup(json: string): Promise<ImportResult> {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    return { ok: false, error: "That file isn't valid JSON." }
  }
  if (typeof parsed !== 'object' || parsed === null) {
    return { ok: false, error: 'That file does not look like an OpenQuiz export.' }
  }

  const data = parsed as Record<string, unknown>

  if (data.format === 'openquiz-library') {
    const backup = data as unknown as LibraryBackup
    const sets = (Array.isArray(backup.sets) ? backup.sets : [])
      .map((set) => normalizeSet(set as unknown as Record<string, unknown>))
      .filter((set): set is StudySet => set !== null)
    if (sets.length === 0) return { ok: false, error: 'That backup contains no sets.' }

    await db.transaction('rw', db.sets, db.folders, db.progress, db.modeStats, async () => {
      await db.sets.bulkPut(sets)
      if (Array.isArray(backup.folders)) await db.folders.bulkPut(backup.folders)
      if (Array.isArray(backup.progress)) await db.progress.bulkPut(backup.progress)
      if (Array.isArray(backup.modeStats)) await db.modeStats.bulkPut(backup.modeStats)
    })
    return { ok: true, sets: sets.length, kind: 'library' }
  }

  if (data.format === 'openquiz-set' || Array.isArray(data.terms)) {
    const single = data as unknown as SetExport
    // A single-set export has no ids, so it always lands as a new set.
    const set = normalizeSet({ ...data, id: newId(), title: single.title })
    if (!set) return { ok: false, error: 'That set has no usable terms.' }
    set.terms = set.terms.map((term) => ({ ...term, id: newId() }))
    await db.sets.put(set)
    return { ok: true, sets: 1, kind: 'set' }
  }

  return { ok: false, error: 'That file does not look like an OpenQuiz export.' }
}

export async function wipeLibrary(): Promise<void> {
  await db.transaction('rw', db.sets, db.folders, db.progress, db.modeStats, async () => {
    await Promise.all([
      db.sets.clear(),
      db.folders.clear(),
      db.progress.clear(),
      db.modeStats.clear(),
    ])
  })
}
