import type { Accent } from '@/lib/types'
import { useEntered } from './motion'

interface Marker {
  /** 0..1 */
  value: number
  accent: Accent
  label: string
}

/** One shared track with a marker per person (joint reading); markers glide in from the start. */
export function DualProgressBar({ a, b }: { a: Marker; b: Marker }) {
  const entered = useEntered()
  return (
    <div className="relative my-3 h-2.5 rounded-md bg-border" aria-label={`${a.label} y ${b.label}`}>
      {[a, b].map((m) => {
        const pct = Math.min(1, Math.max(0, m.value)) * 100
        return (
          <div
            key={m.accent}
            className="absolute top-1/2 grid h-[26px] w-[26px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-[3px] border-surface text-[10px] font-bold text-surface"
            style={{
              left: entered ? `${pct}%` : 0,
              background: `var(--${m.accent})`,
              transition: 'left 1.2s var(--ease)',
            }}
            title={`${m.label}: ${Math.round(pct)} %`}
          >
            {m.label.charAt(0).toUpperCase()}
          </div>
        )
      })}
    </div>
  )
}
