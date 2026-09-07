import '@testing-library/jest-dom/vitest'
import 'fake-indexeddb/auto'

// jsdom has no speech synthesis; every mode must degrade rather than throw.
if (!('speechSynthesis' in window)) {
  Object.defineProperty(window, 'speechSynthesis', {
    writable: true,
    value: {
      speak: () => {},
      cancel: () => {},
      getVoices: () => [],
      addEventListener: () => {},
    },
  })
  Object.defineProperty(window, 'SpeechSynthesisUtterance', {
    writable: true,
    value: class {
      text: string
      lang = ''
      rate = 1
      voice: unknown = null
      constructor(text: string) {
        this.text = text
      }
    },
  })
}

// jsdom has no IntersectionObserver, which Motion needs for `whileInView`.
// Report everything as visible so scroll-reveal content renders in tests.
if (!('IntersectionObserver' in globalThis)) {
  const stub = function (this: unknown, callback: IntersectionObserverCallback) {
    return {
      root: null,
      rootMargin: '',
      thresholds: [] as ReadonlyArray<number>,
      observe(target: Element) {
        callback(
          [{ isIntersecting: true, target } as IntersectionObserverEntry],
          this as unknown as IntersectionObserver,
        )
      },
      unobserve() {},
      disconnect() {},
      takeRecords: () => [] as IntersectionObserverEntry[],
    }
  }
  Object.defineProperty(globalThis, 'IntersectionObserver', { writable: true, value: stub })
}
