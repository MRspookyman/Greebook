import { useEffect, useRef, useState, type ReactNode } from 'react'
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
  editable?: boolean
  editLabel?: string
  inputId?: string
  invalid?: boolean
  describedBy?: string
  inputMode?: 'numeric' | 'text'
  parse?: (value: string) => number | null
  format?: (value: number) => string
}

/** Large value with quick adjustments and optional exact entry. */
export function Stepper({
  value,
  onChange,
  step,
  min,
  max,
  display,
  caption,
  label,
  editable = false,
  editLabel = 'Escribir el valor',
  inputId,
  invalid,
  describedBy,
  inputMode = 'numeric',
  parse = (text) => (/^\d+$/.test(text.trim()) ? Number(text) : null),
  format = String,
}: Props) {
  const clamp = (v: number) => Math.min(max ?? Infinity, Math.max(min, v))
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const cancelled = useRef(false)

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  function commit() {
    if (cancelled.current) return
    cancelled.current = true
    const parsed = parse(draft)
    if (parsed !== null && Number.isSafeInteger(parsed)) onChange(clamp(parsed))
    setEditing(false)
  }

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
        <Minus size={24} aria-hidden />
      </button>
      <div className="min-w-0 flex-1 text-center">
        {editable && editing ? (
          <input
            ref={inputRef}
            id={inputId}
            className="input min-h-14 w-full text-center font-serif text-3xl"
            name="position"
            autoComplete="off"
            inputMode={inputMode}
            aria-label={editLabel}
            aria-invalid={invalid}
            aria-describedby={describedBy}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === 'Escape') {
                event.preventDefault()
                event.stopPropagation()
                cancelled.current = event.key === 'Escape'
                if (!cancelled.current) commit()
                else setEditing(false)
                requestAnimationFrame(() => triggerRef.current?.focus())
              }
            }}
          />
        ) : editable ? (
          <button
            ref={triggerRef}
            id={inputId}
            type="button"
            className="stat-number min-h-14 text-[44px] leading-none underline decoration-border decoration-dotted underline-offset-8"
            aria-label={`${editLabel}: ${format(value)}`}
            aria-invalid={invalid}
            aria-describedby={describedBy}
            onClick={() => {
              cancelled.current = false
              setDraft(format(value))
              setEditing(true)
            }}
          >
            {display}
          </button>
        ) : (
          <div className="stat-number text-[44px] leading-none" aria-live="polite">
            {display}
          </div>
        )}
        {editable && !editing && <p className="mt-2 text-xs text-muted">Toca para escribir</p>}
        {caption && <div className="mt-1.5 text-sm font-medium text-muted">{caption}</div>}
      </div>
      <button
        type="button"
        className={btn}
        aria-label="Más"
        disabled={max !== undefined && value >= max}
        onClick={() => onChange(clamp(value + step))}
      >
        <Plus size={24} aria-hidden />
      </button>
    </div>
  )
}
