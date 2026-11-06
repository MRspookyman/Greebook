import { useEffect, useState } from 'react'

/**
 * False on the first paint, true right after. Bind widths/offsets to it so bars, rings
 * and markers grow from zero when a screen opens (the "entrada coordinada").
 */
export function useEntered(): boolean {
  const [entered, setEntered] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setEntered(true)))
    return () => cancelAnimationFrame(id)
  }, [])
  return entered
}

export function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
}
