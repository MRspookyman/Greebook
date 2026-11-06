import { useEffect, useRef, type ReactNode } from 'react'
import { Minus, Plus } from 'lucide-react'

interface Props {
  value: number
  onChange: (value: number) => void
  step: number
  min: number
  max?: number
  /** Big serif display of the value, e.g. "p. 226". */
  display: ReactNode
  /** Line under the value, e.g. "+12 páginas · 39 %". */
  caption?: ReactNode
  label: string
}

/** Large value with − / + buttons: changes numbers without opening the keyboard. */
export function Stepper({ value, onChange, step, min, max, display, caption, label }: Props) {
  const clamp = (v: number) => Math.min(max ?? Infinity, Math.max(min, v))
  const valueRef = useRef<HTMLDivElement>(null)

  // Bump the number on every change.
  useEffect(() => {
    const el = valueRef.current
    if (!el) return
    el.classList.remove('bump')
    void el.offsetWidth
    el.classList.add('bump')
  }, [value])

  const btn =
    'grid h-[52px] w-[52px] flex-none place-items-center rounded-2xl bg-soft text-accent transition-transform duration-200 [transition-timing-function:var(--spring)] active:scale-[0.88] disabled:opacity-40'
  return (
    <div className="flex items-center justify-between gap-2.5" role="group" aria-label={label}>
      <button
        type="button"
        className={btn}
        aria-label="Menos"
        disabled={value <= min}
        onClick={() => onChange(clamp(value - step))}
      >
        <Minus size={24} />
      </button>
      <div className="flex-1 text-center" aria-live="polite">
        <div ref={valueRef} className="stat-number text-[44px] leading-none">
          {display}
        </div>
        {caption && <div className="mt-1.5 text-sm font-medium text-muted">{caption}</div>}
      </div>
      <button
        type="button"
        className={btn}
        aria-label="Más"
        disabled={max !== undefined && value >= max}
        onClick={() => onChange(clamp(value + step))}
      >
        <Plus size={24} />
      </button>
    </div>
  )
}
