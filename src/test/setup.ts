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
