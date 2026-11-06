import { useEffect, useRef, useState } from 'react'
import { prefersReducedMotion } from './motion'

interface Props {
  value: number
  /** Formats the animated (possibly fractional) value. Default: rounded integer. */
  format?: (n: number) => string
  duration?: number
}

/** Number that counts from its previous value to the new one. */
export function CountUp({ value, format = (n) => String(Math.round(n)), duration = 700 }: Props) {
  const [shown, setShown] = useState(prefersReducedMotion() ? value : 0)
  const from = useRef(shown)

  useEffect(() => {
    if (prefersReducedMotion()) {
      setShown(value)
      from.current = value
      return
    }
    const start = performance.now()
    const origin = from.current
    let raf = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      const v = origin + (value - origin) * eased
      setShown(v)
      from.current = v
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, duration])

  return <span className="num">{format(shown)}</span>
}
