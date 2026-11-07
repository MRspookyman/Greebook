import type { Accent } from '@/lib/types'
import { useEntered } from './motion'

interface Marker {
  /** 0..1 */
  value: number
  accent: Accent
  label: string
  /** Extra text on the flag after the name, e.g. "p. 214". */
  caption?: string
}

interface Stop {
  /** 0..1 */
  value: number
  /** Both have passed it. */
  done: boolean
  label: string
}

/**
 * One shared track: my flag hangs below it and my partner's stands above it, so they never
 * cover each other however close we are. Optional stops (club de dos) sit on the track.
 */
export function DualProgressBar({ a, b, stops = [] }: { a: Marker; b: Marker; stops?: Stop[] }) {
  const entered = useEntered()
  const clamp = (v: number) => Math.min(1, Math.max(0, v)) * 100
  const flag = (m: Marker, below: boolean) => {
    const pct = clamp(m.value)
    return (
      <div
        key={m.label + below}
        className={`pointer-events-none absolute inset-x-0 text-xs font-semibold ${below ? 'top-[34px]' : 'bottom-[50px]'}`}
        style={{ transform: `translateX(${entered ? pct : 0}%)`, transition: 'transform 140ms var(--ease)' }}
        title={`${m.label}: ${Math.round(pct)} %`}
      >
        <div
          className={`flex w-fit max-w-[90%] items-center ${below ? 'flex-col' : 'flex-col-reverse'}`}
          style={{ transform: `translateX(-${entered ? pct : 0}%)`, transition: 'transform 140ms var(--ease)' }}
        >
          <span className="h-2 w-px" style={{ background: `var(--${m.accent})` }} />
          <span
            className="wrap-anywhere px-1.5 py-px text-center text-xs font-normal text-ink"
            style={{ background: 'var(--bg)' }}
          >
            {m.label}
            {m.caption ? ` · ${m.caption}` : ''}
          </span>
        </div>
      </div>
    )
  }
  return (
    <div
      className="relative mx-3 min-h-[78px] overflow-x-clip"
      role="img"
      aria-label={`${a.label}: ${Math.round(clamp(a.value))} %. ${b.label}: ${Math.round(clamp(b.value))} %`}
    >
      <div className="absolute inset-x-0 top-[28px] h-px bg-rule" />
      <div
        className="absolute inset-x-0 top-[28px] h-px origin-left"
        style={{
          transform: `scaleX(${entered ? clamp(Math.min(a.value, b.value)) / 100 : 0})`,
          background: 'var(--amber)',
          transition: 'transform 140ms var(--ease)',
        }}
      />
      {stops.map((stop) => (
        <span
          key={stop.label}
          className={`absolute top-[25px] h-[7px] w-[7px] -translate-x-1/2 rounded-full border border-amber ${stop.done ? 'bg-amber' : 'bg-surface'}`}
          style={{ left: `${clamp(stop.value)}%` }}
          title={stop.label}
        />
      ))}
      {flag(b, false)}
      {flag(a, true)}
    </div>
  )
}
