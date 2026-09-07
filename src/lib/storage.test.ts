import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  formatBytes,
  getStorageStatus,
  isInstalled,
  isIosBrowser,
  requestPersistentStorage,
} from './storage'

function stubStorage(value: unknown) {
  Object.defineProperty(navigator, 'storage', { configurable: true, value })
}

afterEach(() => {
  Reflect.deleteProperty(navigator, 'storage')
  Reflect.deleteProperty(navigator, 'maxTouchPoints')
})

describe('getStorageStatus', () => {
  it('reports persistent storage with usage', async () => {
    stubStorage({
      persisted: async () => true,
      estimate: async () => ({ usage: 2048, quota: 4096 }),
    })
    expect(await getStorageStatus()).toEqual({
      durability: 'persistent',
      usage: 2048,
      quota: 4096,
    })
  })

  it('reports best-effort when the browser has not granted persistence', async () => {
    stubStorage({ persisted: async () => false, estimate: async () => ({}) })
    expect((await getStorageStatus()).durability).toBe('best-effort')
  })

  it('reports unsupported where the API is missing', async () => {
    expect((await getStorageStatus()).durability).toBe('unsupported')
  })

  it('reports unsupported rather than throwing when the API rejects', async () => {
    stubStorage({
      persisted: async () => {
        throw new Error('denied')
      },
    })
    expect((await getStorageStatus()).durability).toBe('unsupported')
  })
})

describe('requestPersistentStorage', () => {
  it('does not re-ask once storage is already persistent', async () => {
    const persist = vi.fn(async () => true)
    stubStorage({ persisted: async () => true, persist })
    expect(await requestPersistentStorage()).toBe('persistent')
    expect(persist).not.toHaveBeenCalled()
  })

  it('asks, and reports persistent when the browser grants it', async () => {
    stubStorage({ persisted: async () => false, persist: async () => true })
    expect(await requestPersistentStorage()).toBe('persistent')
  })

  it('treats a refusal as best-effort rather than an error', async () => {
    stubStorage({ persisted: async () => false, persist: async () => false })
    expect(await requestPersistentStorage()).toBe('best-effort')
  })

  it('is a no-op where the API is missing', async () => {
    expect(await requestPersistentStorage()).toBe('unsupported')
  })
})

describe('formatBytes', () => {
  it('scales through the units', () => {
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(2048)).toBe('2.0 KB')
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB')
    expect(formatBytes(20 * 1024 * 1024)).toBe('20 MB')
  })
})

describe('platform checks', () => {
  it('detects iPadOS, which reports itself as a Mac with touch', () => {
    Object.defineProperty(navigator, 'maxTouchPoints', { configurable: true, value: 5 })
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (Macintosh)')
    expect(isIosBrowser()).toBe(true)
    vi.restoreAllMocks()
  })

  it('does not mistake a desktop Mac for iOS', () => {
    Object.defineProperty(navigator, 'maxTouchPoints', { configurable: true, value: 0 })
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (Macintosh)')
    expect(isIosBrowser()).toBe(false)
    vi.restoreAllMocks()
  })

  it('reports not installed in a normal browser tab', () => {
    expect(isInstalled()).toBe(false)
  })
})
