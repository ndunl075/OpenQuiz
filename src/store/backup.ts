import { exportLibrary } from '../lib/backup'
import { download } from '../lib/exportSet'

/** Filename with the date in it, so successive backups do not overwrite. */
export function backupFilename(now = new Date()): string {
  return `openquiz-backup-${now.toISOString().slice(0, 10)}.json`
}

/** Writes the whole library to a file the browser downloads. */
export async function backupLibrary(): Promise<void> {
  const backup = await exportLibrary()
  download(backupFilename(), JSON.stringify(backup, null, 2))
}
