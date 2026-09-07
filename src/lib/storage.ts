/**
 * Browser storage durability.
 *
 * IndexedDB defaults to "best-effort": a browser may evict it when the device
 * runs low on space. `navigator.storage.persist()` asks for "persistent"
 * instead, which browsers grant based on engagement or on the app being
 * installed, and which exempts the origin from routine eviction.
 *
 * This cannot be requested once and forgotten — a browser may decline now and
 * grant later — so the app asks again whenever there is data worth keeping.
 */

export type Durability = 'persistent' | 'best-effort' | 'unsupported'

export interface StorageStatus {
  durability: Durability
  /** Bytes currently used by this origin, when the browser will say. */
  usage?: number
  /** Bytes this origin may use, when the browser will say. */
  quota?: number
}

function supported(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.storage?.persisted === 'function'
}

export async function getStorageStatus(): Promise<StorageStatus> {
  if (!supported()) return { durability: 'unsupported' }
  try {
    const persisted = await navigator.storage.persisted()
    const estimate = (await navigator.storage.estimate?.()) ?? {}
    return {
      durability: persisted ? 'persistent' : 'best-effort',
      usage: estimate.usage,
      quota: estimate.quota,
    }
  } catch {
    return { durability: 'unsupported' }
  }
}

/**
 * Ask the browser to keep this origin's data. Returns the resulting state.
 * Declining is normal and not an error: the data is still saved, just evictable
 * if the device runs out of room.
 */
export async function requestPersistentStorage(): Promise<Durability> {
  if (!supported() || typeof navigator.storage.persist !== 'function') return 'unsupported'
  try {
    if (await navigator.storage.persisted()) return 'persistent'
    return (await navigator.storage.persist()) ? 'persistent' : 'best-effort'
  } catch {
    return 'unsupported'
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit++
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`
}

/**
 * iOS clears script-writable storage for a site the user has not opened in
 * seven days — unless the site has been added to the Home Screen. Nothing the
 * page can do prevents it, so the app says so rather than letting people find
 * out by losing a term list.
 */
export function isIosBrowser(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  const iOS = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
  return iOS
}

export function isInstalled(): boolean {
  if (typeof window === 'undefined') return false
  const standalone = (navigator as { standalone?: boolean }).standalone
  return window.matchMedia?.('(display-mode: standalone)').matches === true || standalone === true
}
