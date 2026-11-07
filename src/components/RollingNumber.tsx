import { useState } from 'react'

interface Props {
  value: number
  /** How the value is written, e.g. a clock. Default: plain integer. */
  format?: (value: number) => string
  className?: string
}

/**
 * Number whose changed digits roll in like a mechanical counter: up when the value grows,
 * down when it shrinks. Unchanged digits stay still. Purely visual (aria-hidden); pair it
 * with an accessible label on the surrounding control.
 */
export function RollingNumber({ value, format = String, className = '' }: Props) {
  const text = format(value)
  const [shown, setShown] = useState({ value, text, previous: text, direction: 'up' as 'up' | 'down' })
  if (shown.value !== value || shown.text !== text) {
    // Derived state: remember what was on screen so only the digits that differ animate.
    setShown({ value, text, previous: shown.text, direction: value < shown.value ? 'down' : 'up' })
  }
  const chars = text.split('')
  const before = shown.previous.split('')
  return (
    <span className={`inline-flex ${className}`} aria-hidden>
      {chars.map((char, index) => {
        // Align from the right so units stay in place when the number gains a digit.
        const place = chars.length - index
        const changed = before[before.length - place] !== char && /\d/.test(char)
        return (
          <span
            key={`${place}-${char}`}
            className="inline-block"
            style={
              changed
                ? { animation: `${shown.direction === 'up' ? 'gb-roll-up' : 'gb-roll-down'} 280ms var(--ease) both` }
                : undefined
            }
          >
            {char}
          </span>
        )
      })}
    </span>
  )
}
