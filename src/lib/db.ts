import Dexie, { type EntityTable } from 'dexie'
import {
  DEFAULT_SETTINGS,
  type Folder,
  type ModeStats,
  type Progress,
  type Settings,
  type StudySet,
} from './types'

/**
 * Single local database. There is no server: this file is the entire
 * persistence layer. Compound key [setId+termId] lets progress survive
 * set edits and be shared across every study mode.
 */
class OpenQuizDB extends Dexie {
  sets!: EntityTable<StudySet, 'id'>
  folders!: EntityTable<Folder, 'id'>
  progress!: EntityTable<Progress, 'setId'>
  modeStats!: EntityTable<ModeStats, 'id'>
  settings!: EntityTable<Settings, 'id'>

  constructor() {
    super('openquiz')
    this.version(1).stores({
      sets: 'id, title, folderId, updatedAt, createdAt',
      folders: 'id, name, createdAt',
      progress: '[setId+termId], setId, termId, status, box',
      modeStats: 'id, setId, mode, lastPlayed',
      settings: 'id',
    })
  }
}

export const db = new OpenQuizDB()

export async function getSettings(): Promise<Settings> {
  const stored = await db.settings.get('singleton')
  return { ...DEFAULT_SETTINGS, ...stored, id: 'singleton' }
}

export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  const next = { ...(await getSettings()), ...patch, id: 'singleton' as const }
  await db.settings.put(next)
  return next
}
