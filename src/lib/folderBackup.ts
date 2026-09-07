import { db } from './db'
import { exportLibrary } from './backup'

/**
 * Automatic backups into a folder the user picks.
 *
 * The File System Access API is the only way a page can write a real file
 * without a download prompt every time. The handle is stored in IndexedDB —
 * handles are structured-cloneable, so they survive reloads — but permission is
 * not: browsers require a user gesture to re-grant it after a restart, which is
 * why `reconnect` exists separately from `isConnected`.
 *
 * Chromium desktop only. Everywhere else `supportsFolderBackup()` is false and
 * the feature is hidden rather than offered and broken.
 */

const HANDLE_KEY = 'folderBackupHandle'
const FILENAME = 'openquiz-backup.json'

interface HandleRow {
  id: string
  handle: FileSystemDirectoryHandle
}

export function supportsFolderBackup(): boolean {
  return typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function'
}

/**
 * Held in memory for the session and persisted for the next one.
 *
 * The cache is not just an optimisation: a browser may refuse to store the
 * handle, and the feature should still work for the rest of the session rather
 * than fail on a write it could have made.
 */
let cached: FileSystemDirectoryHandle | null | undefined

/** Dexie has no table for this, so it rides in `settings` under its own key. */
async function readHandle(): Promise<FileSystemDirectoryHandle | null> {
  if (cached !== undefined) return cached
  try {
    const row = (await db.table('settings').get(HANDLE_KEY)) as HandleRow | undefined
    cached = row?.handle ?? null
  } catch {
    cached = null
  }
  return cached
}

async function writeHandle(handle: FileSystemDirectoryHandle | null): Promise<void> {
  cached = handle
  try {
    if (handle === null) await db.table('settings').delete(HANDLE_KEY)
    else await db.table('settings').put({ id: HANDLE_KEY, handle })
  } catch {
    // Some browsers decline to store a handle. It still works this session.
  }
}

/** Test seam: drops the in-memory handle so the next read hits the database. */
export function resetFolderCache(): void {
  cached = undefined
}

export type FolderState = 'unsupported' | 'off' | 'needs-permission' | 'on'

export interface FolderStatus {
  state: FolderState
  name?: string
}

export async function getFolderStatus(): Promise<FolderStatus> {
  if (!supportsFolderBackup()) return { state: 'unsupported' }
  const handle = await readHandle()
  if (!handle) return { state: 'off' }
  const permission = await handle.queryPermission({ mode: 'readwrite' })
  return { state: permission === 'granted' ? 'on' : 'needs-permission', name: handle.name }
}

/** Asks the user to choose a folder. Must be called from a user gesture. */
export async function chooseFolder(): Promise<FolderStatus> {
  const picker = window.showDirectoryPicker
  if (!picker) return { state: 'unsupported' }
  try {
    const handle = await picker.call(window, { mode: 'readwrite', id: 'openquiz-backup' })
    await writeHandle(handle)
    await writeBackup()
    return { state: 'on', name: handle.name }
  } catch {
    // The picker throws when dismissed; that is a choice, not a failure.
    return getFolderStatus()
  }
}

/** Re-grants permission after a browser restart. Must be a user gesture. */
export async function reconnectFolder(): Promise<FolderStatus> {
  const handle = await readHandle()
  if (!handle) return { state: 'off' }
  const permission = await handle.requestPermission({ mode: 'readwrite' })
  if (permission === 'granted') await writeBackup()
  return { state: permission === 'granted' ? 'on' : 'needs-permission', name: handle.name }
}

export async function forgetFolder(): Promise<void> {
  await writeHandle(null)
}

/**
 * Writes the library to the chosen folder. Silently does nothing when no
 * folder is set or permission has lapsed — a study session must never be
 * interrupted by a backup problem.
 */
export async function writeBackup(): Promise<boolean> {
  if (!supportsFolderBackup()) return false
  const handle = await readHandle()
  if (!handle) return false
  try {
    if ((await handle.queryPermission({ mode: 'readwrite' })) !== 'granted') return false
    const file = await handle.getFileHandle(FILENAME, { create: true })
    const writable = await file.createWritable()
    await writable.write(JSON.stringify(await exportLibrary(), null, 2))
    await writable.close()
    return true
  } catch {
    return false
  }
}

let pending: ReturnType<typeof setTimeout> | undefined

/**
 * Coalesces the writes that a burst of edits produces — typing in the set
 * editor should not mean a file write per keystroke.
 */
export function scheduleBackup(delayMs = 1500): void {
  if (!supportsFolderBackup()) return
  clearTimeout(pending)
  pending = setTimeout(() => {
    void writeBackup()
  }, delayMs)
}
