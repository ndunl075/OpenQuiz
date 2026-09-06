import { useCallback, useEffect, useState } from 'react'

/** Minimal async-data hook: run `fn`, expose value + loading + a manual refresh. */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [value, setValue] = useState<T | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(fn, deps)

  useEffect(() => {
    let alive = true
    setLoading(true)
    run()
      .then((result) => {
        if (alive) setValue(result)
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [run, tick])

  const refresh = useCallback(() => setTick((t) => t + 1), [])
  return { value, loading, refresh, setValue }
}
