import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from './db'
import {
  chooseFolder,
  forgetFolder,
  getFolderStatus,
  reconnectFolder,
  scheduleBackup,
  resetFolderCache,
  supportsFolderBackup,
  writeBackup,
} from './folderBackup'

/** A directory handle that records what was written to it. */
function fakeFolder(name = 'Backups', permission: PermissionState = 'granted') {
  const written: string[] = []
  let current = permission
  const handle = {
    name,
    written,
    setPermission: (next: PermissionState) => {
      current = next
    },
    queryPermission: vi.fn(async () => current),
    requestPermission: vi.fn(async () => {
      current = 'granted'
      return current
    }),
    getFileHandle: vi.fn(async () => ({
      name: 'openquiz-backup.json',
      createWritable: async () => ({
        write: async (data: string) => {
          written.push(data)
        },
        close: async () => {},
      }),
    })),
  }
  return handle
}

function installPicker(handle: unknown) {
  const picker = vi.fn(async () => handle)
  Object.defineProperty(window, 'showDirectoryPicker', { configurable: true, value: picker })
  return picker
}

beforeEach(async () => {
  resetFolderCache()
  await Promise.all([db.sets.clear(), db.settings.clear()])
  Reflect.deleteProperty(window, 'showDirectoryPicker')
  vi.useRealTimers()
})

describe('supportsFolderBackup', () => {
  it('is false where the browser has no picker', () => {
    expect(supportsFolderBackup()).toBe(false)
  })
})

describe('getFolderStatus', () => {
  it('reports unsupported without the API', async () => {
    expect(await getFolderStatus()).toEqual({ state: 'unsupported' })
  })

  it('reports off before a folder is chosen', async () => {
    installPicker(fakeFolder())
    expect((await getFolderStatus()).state).toBe('off')
  })
})

describe('chooseFolder', () => {
  it('remembers the folder and writes a backup immediately', async () => {
    const folder = fakeFolder('Study Backups')
    installPicker(folder)
    const status = await chooseFolder()
    expect(status).toEqual({ state: 'on', name: 'Study Backups' })
    expect(folder.written).toHaveLength(1)
    expect(JSON.parse(folder.written[0]).format).toBe('openquiz-library')
  })

  it('survives the picker being dismissed', async () => {
    Object.defineProperty(window, 'showDirectoryPicker', {
      configurable: true,
      value: vi.fn(async () => {
        throw new DOMException('The user aborted a request.', 'AbortError')
      }),
    })
    expect((await chooseFolder()).state).toBe('off')
  })
})

describe('permission lapsing', () => {
  it('reports needs-permission and writes nothing until reconnected', async () => {
    const folder = fakeFolder('Backups')
    installPicker(folder)
    await chooseFolder()
    folder.written.length = 0

    folder.setPermission('prompt')
    expect((await getFolderStatus()).state).toBe('needs-permission')
    expect(await writeBackup()).toBe(false)
    expect(folder.written).toHaveLength(0)

    const status = await reconnectFolder()
    expect(status.state).toBe('on')
    expect(folder.requestPermission).toHaveBeenCalled()
    expect(folder.written).toHaveLength(1)
  })

  it('does nothing when no folder was ever chosen', async () => {
    installPicker(fakeFolder())
    expect(await writeBackup()).toBe(false)
    expect((await reconnectFolder()).state).toBe('off')
  })
})

describe('forgetFolder', () => {
  it('stops writing', async () => {
    const folder = fakeFolder()
    installPicker(folder)
    await chooseFolder()
    await forgetFolder()
    expect((await getFolderStatus()).state).toBe('off')
    expect(await writeBackup()).toBe(false)
  })
})

describe('writeBackup', () => {
  it('never throws when the disk refuses', async () => {
    const folder = fakeFolder()
    folder.getFileHandle = vi.fn(async () => {
      throw new Error('disk full')
    })
    installPicker(folder)
    await chooseFolder()
    expect(await writeBackup()).toBe(false)
  })
})

describe('scheduleBackup', () => {
  it('coalesces a burst of edits into one write', async () => {
    // Real timers: the write awaits IndexedDB, which fake timers stall.
    const folder = fakeFolder()
    installPicker(folder)
    await chooseFolder()
    folder.written.length = 0

    scheduleBackup(20)
    scheduleBackup(20)
    scheduleBackup(20)
    await new Promise((resolve) => setTimeout(resolve, 150))

    expect(folder.written).toHaveLength(1)
  })
})
