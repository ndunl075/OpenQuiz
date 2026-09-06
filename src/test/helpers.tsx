import { render } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { ReactElement } from 'react'
import { db } from '../lib/db'
import { useSettings } from '../store/useSettings'
import { DEFAULT_SETTINGS, type Settings, type StudySet, type Term } from '../lib/types'

export function makeTerms(pairs: Array<[string, string]>): Term[] {
  return pairs.map(([term, definition], i) => ({
    id: `t${i + 1}`,
    term,
    definition,
    starred: false,
  }))
}

export const SAMPLE_PAIRS: Array<[string, string]> = [
  ['mitochondria', 'powerhouse of the cell'],
  ['ribosome', 'builds proteins'],
  ['nucleus', 'holds the DNA'],
  ['chloroplast', 'site of photosynthesis'],
  ['vacuole', 'stores water'],
  ['lysosome', 'breaks down waste'],
]

export async function seedSet(overrides: Partial<StudySet> = {}): Promise<StudySet> {
  const now = Date.now()
  const set: StudySet = {
    id: 'set-1',
    title: 'Cell Biology',
    description: 'Organelles',
    terms: makeTerms(SAMPLE_PAIRS),
    termLang: 'en-US',
    defLang: 'en-US',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
  await db.sets.put(set)
  return set
}

/**
 * Modes read settings from the Zustand store, which App normally hydrates.
 * Tests render modes directly, so set the store as well as the database.
 */
export async function setSettings(patch: Partial<Settings>) {
  const settings = { ...DEFAULT_SETTINGS, ...patch, id: 'singleton' as const }
  await db.settings.put(settings)
  useSettings.setState({ settings, loaded: true })
}

export async function clearDb() {
  useSettings.setState({ settings: DEFAULT_SETTINGS, loaded: true })
  await Promise.all([
    db.sets.clear(),
    db.folders.clear(),
    db.progress.clear(),
    db.modeStats.clear(),
    db.settings.clear(),
  ])
}

/** Definition for a term, and vice versa, for the sample set. */
export const DEFINITION_OF = new Map(SAMPLE_PAIRS)
export const TERM_OF = new Map(SAMPLE_PAIRS.map(([term, def]) => [def, term]))

/** Renders `element` at `/set/:id/<path>` with routing wired up. */
export function renderAtSetRoute(element: ReactElement, path: string, setId = 'set-1') {
  return render(
    <MemoryRouter initialEntries={[`/set/${setId}/${path}`]}>
      <Routes>
        <Route path="/set/:id/*" element={element} />
        <Route path="*" element={<div>elsewhere</div>} />
      </Routes>
    </MemoryRouter>,
  )
}
