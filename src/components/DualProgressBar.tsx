import type { Accent } from '@/lib/types'

interface Marker {
  /** 0..1 */
  value: number
  accent: Accent
  label: string
}

/** One shared track with a marker per person (joint reading). */
export function DualProgressBar({ a, b }: { a: Marker; b: Marker }) {
  return (
    <div className="relative h-8" aria-label={`${a.label} y ${b.label}`}>
      <div className="absolute top-1/2 -translate-y-1/2 inset-x-0 h-2 rounded-full bg-border" />
      {[a, b].map((m) => {
        const pct = Math.min(1, Math.max(0, m.value)) * 100
        return (
          <div
            key={m.accent}
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full border-2 border-surface flex items-center justify-center text-[11px] font-semibold text-surface"
            style={{ left: `${pct}%`, background: `var(--${m.accent})` }}
            title={`${m.label}: ${Math.round(pct)} %`}
          >
            {m.label.charAt(0).toUpperCase()}
          </div>
        )
      })}
    </div>
  )
}
