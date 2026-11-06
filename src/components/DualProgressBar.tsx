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
        className={`absolute flex -translate-x-1/2 items-center text-[10px] font-semibold ${below ? 'top-[34px] flex-col' : 'bottom-[34px] flex-col-reverse'}`}
        style={{ left: entered ? `${pct}%` : 0, color: `var(--${m.accent})`, transition: 'left 1.2s var(--ease)' }}
        title={`${m.label}: ${Math.round(pct)} %`}
      >
        <span className="h-2 w-0.5 bg-current" />
        <span
          className="num whitespace-nowrap rounded-[7px] px-1.5 py-px text-surface"
          style={{ background: `var(--${m.accent})` }}
        >
          {m.label}
          {m.caption ? ` · ${m.caption}` : ''}
        </span>
      </div>
    )
  }
  return (
    <div
      className="relative mx-3 h-[62px]"
      role="img"
      aria-label={`${a.label}: ${Math.round(clamp(a.value))} %. ${b.label}: ${Math.round(clamp(b.value))} %`}
    >
      <div className="absolute inset-x-0 top-[28px] h-1.5 rounded-full bg-border" />
      <div
        className="absolute top-[28px] left-0 h-1.5 rounded-full opacity-50"
        style={{
          width: entered ? `${clamp(Math.min(a.value, b.value))}%` : 0,
          background: 'var(--amber)',
          transition: 'width 1.2s var(--ease)',
        }}
      />
      {stops.map((stop) => (
        <span
          key={stop.label}
          className={`absolute top-[23px] h-4 w-4 -translate-x-1/2 rounded-full border-2 border-amber ${stop.done ? 'bg-amber' : 'bg-surface'}`}
          style={{ left: `${clamp(stop.value)}%` }}
          title={stop.label}
        />
      ))}
      {flag(b, false)}
      {flag(a, true)}
    </div>
  )
}
