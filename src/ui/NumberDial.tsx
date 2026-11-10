import { useEffect, useRef } from 'react'
import { Minus, Plus } from './icons'

interface Props {
  value: number
  onChange: (value: number) => void
  min?: number
  max: number
  /** Said after the number: «de 384», «%». */
  suffix?: string
  label: string
}

/** A big number you can nudge with the thumb or type over. Holding a button keeps counting. */
export function NumberDial({ value, onChange, min = 0, max, suffix, label }: Props) {
  const latest = useRef({ value, onChange })
  useEffect(() => {
    latest.current = { value, onChange }
  })
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const clamp = (n: number) => Math.max(min, Math.min(max, n))
  const stop = () => clearTimeout(timer.current)
  useEffect(() => stop, [])

  const hold = (step: number) => {
    let delay = 380
    const tick = () => {
      latest.current.onChange(clamp(latest.current.value + step))
      delay = Math.max(45, delay * 0.82)
      timer.current = setTimeout(tick, delay)
    }
    tick()
  }
  const button = (step: number, text: string, icon: React.ReactNode) => (
    <button
      type="button"
      aria-label={text}
      className="grid h-16 w-16 flex-none place-items-center rounded-full bg-ink/10 text-ink transition-transform active:scale-90"
      style={{ touchAction: 'none', WebkitTouchCallout: 'none' }}
      onPointerDown={(event) => {
        event.preventDefault()
        hold(step)
      }}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onContextMenu={(event) => event.preventDefault()}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onChange(clamp(value + step))
        }
      }}
    >
      {icon}
    </button>
  )

  return (
    <div className="flex items-center justify-between gap-3">
      {button(-1, 'Una menos', <Minus />)}
      <label className="flex min-w-0 flex-1 flex-col items-center">
        <span className="sr-only">{label}</span>
        <input
          className="w-full bg-transparent text-center text-[64px] leading-none font-normal tracking-tight text-ink outline-none"
          inputMode="numeric"
          pattern="[0-9]*"
          value={value}
          onFocus={(event) => event.currentTarget.select()}
          onChange={(event) => {
            const digits = event.currentTarget.value.replace(/\D/g, '')
            onChange(clamp(digits ? Number(digits) : min))
          }}
        />
        {suffix && <span className="quiet mt-1 text-[16px]">{suffix}</span>}
      </label>
      {button(1, 'Una más', <Plus />)}
    </div>
  )
}
