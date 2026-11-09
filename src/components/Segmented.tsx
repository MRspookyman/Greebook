import type { ReactNode } from 'react'

export interface SegmentOption<T extends string> {
  value: T
  label: ReactNode
  count?: number
}
interface Props<T extends string> {
  options: SegmentOption<T>[]
  value: T
  onChange: (value: T) => void
  'aria-label': string
  className?: string
  /** Kept for callers; both render as the same soft pill. */
  variant?: 'pill' | 'underline'
}

/** Equal-width choices on a soft pill; the selection slides to the chosen one. */
export function Segmented<T extends string>({ options, value, onChange, className = '', ...rest }: Props<T>) {
  const index = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  )
  return (
    <div
      role="group"
      aria-label={rest['aria-label']}
      className={`relative grid rounded-full bg-sunk p-1 ${className}`}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      <div
        aria-hidden
        className="absolute top-1 bottom-1 left-1 rounded-full bg-surface shadow-[0_2px_8px_-4px_rgb(0_0_0/0.35)]"
        style={{
          width: `calc((100% - 8px) / ${options.length})`,
          transform: `translateX(${index * 100}%)`,
          transition: 'transform var(--dur-move) var(--ease)',
        }}
      />
      {options.map((o) => {
        const on = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.value)}
            className={`relative z-[1] flex min-h-10 items-center justify-center gap-1 rounded-full px-1 text-[14px] font-extrabold transition-colors duration-150 ${on ? 'text-ink' : 'text-muted'}`}
          >
            {o.label}
            {o.count !== undefined && <span className="text-xs font-bold tabular-nums">{o.count}</span>}
          </button>
        )
      })}
    </div>
  )
}
