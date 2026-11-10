import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Press and hold. `progress` goes 0 → 1 while the finger stays down and `done` fires at 1.
 * `start` returns nothing; `cancel` reports whether the hold was cut short (so a hint can be shown).
 */
export function useHold(done: () => void, ms = 700) {
  const [progress, setProgress] = useState(0)
  const frame = useRef(0)
  const began = useRef(0)
  const latest = useRef(done)
  useEffect(() => {
    latest.current = done
  })

  const cancel = useCallback((): boolean => {
    const short = began.current > 0
    cancelAnimationFrame(frame.current)
    began.current = 0
    setProgress(0)
    return short
  }, [])

  const start = useCallback(() => {
    began.current = performance.now()
    const tick = () => {
      if (!began.current) return
      const p = Math.min(1, (performance.now() - began.current) / ms)
      if (p >= 1) {
        began.current = 0
        setProgress(0)
        latest.current()
        return
      }
      setProgress(p)
      frame.current = requestAnimationFrame(tick)
    }
    frame.current = requestAnimationFrame(tick)
  }, [ms])

  useEffect(() => () => cancelAnimationFrame(frame.current), [])
  return { progress, start, cancel }
}
