import { useEffect, useRef, type MouseEvent, type PointerEvent } from 'react'

/**
 * Click steps once; pressing and holding repeats, speeding up the longer it is held
 * (×5 steps after a moment), so going from page 120 to 260 doesn't take 140 taps.
 */
export function useHoldRepeat(onStep: (multiplier: number) => void, disabled = false) {
  const latest = useRef(onStep)
  const timeout = useRef<number | undefined>(undefined)
  const repeats = useRef(0)
  const held = useRef(false)
  useEffect(() => {
    latest.current = onStep
  })
  const stop = () => {
    window.clearTimeout(timeout.current)
    timeout.current = undefined
  }
  useEffect(() => {
    if (disabled) stop()
  }, [disabled])
  useEffect(() => {
    window.addEventListener('pointerup', stop)
    window.addEventListener('blur', stop)
    return () => {
      stop()
      window.removeEventListener('pointerup', stop)
      window.removeEventListener('blur', stop)
    }
  }, [])
  const tick = () => {
    repeats.current += 1
    held.current = true
    latest.current(repeats.current > 14 ? 5 : 1)
    timeout.current = window.setTimeout(tick, repeats.current > 6 ? 55 : 110)
  }
  return {
    onPointerDown(event: PointerEvent<HTMLElement>) {
      if (disabled || event.button !== 0) return
      held.current = false
      repeats.current = 0
      stop()
      timeout.current = window.setTimeout(tick, 420)
    },
    onPointerUp: stop,
    onPointerLeave: stop,
    onPointerCancel: stop,
    onClick(event: MouseEvent<HTMLElement>) {
      if (held.current) {
        // The hold already stepped; the click that ends it must not add one more.
        held.current = false
        event.preventDefault()
        return
      }
      latest.current(1)
    },
    onContextMenu(event: MouseEvent<HTMLElement>) {
      event.preventDefault()
    },
  }
}
