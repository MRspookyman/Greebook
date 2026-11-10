import { useEffect, useRef, useState } from 'react'
import { fmtMinutes, stepMinutes } from '@/lib/time'
import { Minus, Plus } from './icons'

interface Props {
  value: number
  onChange: (minutes: number) => void
  min?: number
  max?: number
}

/** The minutes of an evening: type them, or nudge them five at a time. Holding a button keeps counting. */
export function MinutesField({ value, onChange, min = 1, max = 600 }: Props) {
  // What is being typed, while it is being typed; otherwise the field shows the value.
  const [typing, setTyping] = useState<string | null>(null)
  const latest = useRef({ value, onChange })
  useEffect(() => {
    latest.current = { value, onChange }
  })
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const stop = () => clearTimeout(timer.current)
  useEffect(() => stop, [])

  const nudge = (direction: 1 | -1) => latest.current.onChange(stepMinutes(latest.current.value, direction, min, max))
  const hold = (direction: 1 | -1) => {
    setTyping(null)
    let delay = 420
    const tick = () => {
      nudge(direction)
      delay = Math.max(90, delay * 0.85)
      timer.current = setTimeout(tick, delay)
    }
    tick()
  }
  const button = (direction: 1 | -1, text: string, icon: React.ReactNode) => (
    <button
      type="button"
      className="icon-btn bg-ink/10"
      aria-label={text}
      style={{ touchAction: 'none', WebkitTouchCallout: 'none' }}
      onPointerDown={(event) => {
        event.preventDefault()
        hold(direction)
      }}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onContextMenu={(event) => event.preventDefault()}
      onClick={(event) => {
        if (event.detail !== 0) return
        setTyping(null)
        nudge(direction)
      }}
    >
      {icon}
    </button>
  )

  return (
    <div className="flex flex-col items-end">
      <div className="flex items-center gap-2">
        {button(-1, 'Cinco minutos menos', <Minus size={18} />)}
        <label className="flex items-baseline gap-1.5 rounded-[14px] border-[1.5px] border-rule bg-surface px-3 py-1.5 focus-within:border-flame">
          <span className="sr-only">Minutos leídos</span>
          <input
            className="w-[2.4em] bg-transparent text-center text-[21px] text-ink outline-none"
            inputMode="numeric"
            pattern="[0-9]*"
            enterKeyHint="done"
            value={typing ?? String(value)}
            onFocus={(event) => event.currentTarget.select()}
            onChange={(event) => {
              const digits = event.currentTarget.value.replace(/\D/g, '').slice(0, 3)
              setTyping(digits)
              if (digits) onChange(Math.max(min, Math.min(max, Number(digits))))
            }}
            onBlur={() => setTyping(null)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur()
            }}
          />
          <span className="quiet text-[16px]">min</span>
        </label>
        {button(1, 'Cinco minutos más', <Plus size={18} />)}
      </div>
      {value >= 60 && <p className="quiet mt-1 mr-[58px] text-[15px]">{fmtMinutes(value)}</p>}
    </div>
  )
}
