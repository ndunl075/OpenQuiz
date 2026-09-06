import { useCallback, useEffect, useMemo, useState } from 'react'
import { getSet } from '../store/sets'
import { loadProgress } from '../store/progress'
import type { Progress, StudySet, Term, TermId } from '../lib/types'

export interface StudySetState {
  set?: StudySet
  progress: Map<TermId, Progress>
  loading: boolean
  reloadProgress: () => Promise<void>
  reloadSet: () => Promise<void>
}

/** Loads a set plus its per-term progress, the pair every mode starts from. */
export function useStudySet(id: string): StudySetState {
  const [set, setSet] = useState<StudySet | undefined>()
  const [progress, setProgress] = useState<Map<TermId, Progress>>(new Map())
  const [loading, setLoading] = useState(true)

  const reloadSet = useCallback(async () => {
    setSet(await getSet(id))
  }, [id])

  const reloadProgress = useCallback(async () => {
    setProgress(await loadProgress(id))
  }, [id])

  useEffect(() => {
    let alive = true
    // Loading external data is what an effect is for; guarded by `alive`.
    // oxlint-disable-next-line react/set-state-in-effect
    setLoading(true)
    void Promise.all([getSet(id), loadProgress(id)]).then(([nextSet, nextProgress]) => {
      if (!alive) return
      setSet(nextSet)
      setProgress(nextProgress)
      setLoading(false)
    })
    return () => {
      alive = false
    }
  }, [id])

  return { set, progress, loading, reloadProgress, reloadSet }
}

export interface DeckOptions {
  shuffled: boolean
  starredOnly: boolean
  seed?: number
}

/** Applies the star filter and shuffle a mode's options ask for. */
export function useDeck(terms: readonly Term[] | undefined, options: DeckOptions): Term[] {
  return useMemo(() => {
    let deck = [...(terms ?? [])]
    if (options.starredOnly) {
      const starred = deck.filter((t) => t.starred)
      if (starred.length > 0) deck = starred
    }
    if (options.shuffled) {
      // Seeded so the order survives re-renders but changes on reshuffle.
      let seed = options.seed ?? 1
      const rng = () => {
        seed = (seed * 1664525 + 1013904223) % 4294967296
        return seed / 4294967296
      }
      for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1))
        ;[deck[i], deck[j]] = [deck[j], deck[i]]
      }
    }
    return deck
  }, [terms, options.shuffled, options.starredOnly, options.seed])
}
