export type TermId = string
export type SetId = string
export type FolderId = string

export interface Term {
  id: TermId
  term: string
  definition: string
  starred: boolean
  /** Optional data-URL image stored alongside the term. */
  image?: string
}

export interface StudySet {
  id: SetId
  title: string
  description: string
  terms: Term[]
  folderId?: FolderId
  termLang: string
  defLang: string
  createdAt: number
  updatedAt: number
}

export interface Folder {
  id: FolderId
  name: string
  createdAt: number
}

export type TermStatus = 'new' | 'learning' | 'mastered'

/** Per-term learning state, shared by Learn / Write / Spell. */
export interface Progress {
  setId: SetId
  termId: TermId
  /** Leitner box, 0 (unseen) .. 5 (locked in). */
  box: number
  status: TermStatus
  seen: number
  correct: number
  incorrect: number
  lastSeen: number
  /** Flashcards-only bucket: user self-reported knowledge. */
  known?: boolean
}

export type StudyMode =
  | 'flashcards'
  | 'learn'
  | 'write'
  | 'spell'
  | 'test'
  | 'match'
  | 'gravity'

export interface ModeStats {
  id: string // `${setId}:${mode}`
  setId: SetId
  mode: StudyMode
  bestMs?: number
  bestScore?: number
  plays: number
  lastPlayed: number
}

export type ThemeSetting = 'light' | 'dark' | 'system'
/** Which side of the card is shown as the prompt. */
export type PromptSide = 'term' | 'definition'

export interface Settings {
  id: 'singleton'
  theme: ThemeSetting
  promptSide: PromptSide
  ttsEnabled: boolean
  shuffleDefault: boolean
  starredOnlyDefault: boolean
  typoTolerance: boolean
  reducedMotion: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  id: 'singleton',
  theme: 'system',
  promptSide: 'term',
  ttsEnabled: true,
  shuffleDefault: false,
  starredOnlyDefault: false,
  typoTolerance: true,
  reducedMotion: false,
}
