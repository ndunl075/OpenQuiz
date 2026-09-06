import { useCallback, useEffect, useRef, useState } from 'react'

export function useStopwatch(running: boolean) {
  const [elapsed, setElapsed] = useState(0)
  const startRef = useRef<number | null>(null)
  const baseRef = useRef(0)

  useEffect(() => {
    if (!running) {
      if (startRef.current !== null) {
        baseRef.current += performance.now() - startRef.current
        startRef.current = null
      }
      return
    }
    startRef.current = performance.now()
    let frame = 0
    const tick = () => {
      if (startRef.current !== null) {
        setElapsed(baseRef.current + (performance.now() - startRef.current))
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [running])

  const reset = useCallback(() => {
    baseRef.current = 0
    startRef.current = running ? performance.now() : null
    setElapsed(0)
  }, [running])

  const penalize = useCallback((ms: number) => {
    baseRef.current += ms
  }, [])

  return { elapsed, reset, penalize }
}
