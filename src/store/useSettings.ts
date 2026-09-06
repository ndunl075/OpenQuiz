import { create } from 'zustand'
import { getSettings, saveSettings } from '../lib/db'
import { DEFAULT_SETTINGS, type Settings } from '../lib/types'

interface SettingsState {
  settings: Settings
  loaded: boolean
  load: () => Promise<void>
  update: (patch: Partial<Settings>) => Promise<void>
}

export const useSettings = create<SettingsState>((set) => ({
  settings: DEFAULT_SETTINGS,
  loaded: false,
  async load() {
    const settings = await getSettings()
    set({ settings, loaded: true })
    applyTheme(settings.theme)
  },
  async update(patch) {
    const settings = await saveSettings(patch)
    set({ settings })
    if (patch.theme) applyTheme(settings.theme)
  },
}))

export function applyTheme(theme: Settings['theme']) {
  if (typeof document === 'undefined') return
  const prefersDark =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-color-scheme: dark)').matches
  const resolved = theme === 'system' ? (prefersDark ? 'dark' : 'light') : theme
  document.documentElement.dataset.theme = resolved
}
