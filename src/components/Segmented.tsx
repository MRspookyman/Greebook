import type { ReactNode } from 'react'

export interface SegmentOption<T extends string> {
  value: T
  label: ReactNode
  /** Optional counter badge. */
  count?: number
}

interface Props<T extends string> {
  options: SegmentOption<T>[]
  value: T
  onChange: (value: T) => void
  'aria-label': string
  className?: string
}

/** Segmented control with a sliding pill (spring). */
export function Segmented<T extends string>({ options, value, onChange, className = '', ...rest }: Props<T>) {
  const index = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  )
  return (
    <div
      role="group"
      aria-label={rest['aria-label']}
      className={`relative grid rounded-[13px] bg-track p-[3px] ${className}`}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      <div
        aria-hidden
        className="absolute top-[3px] bottom-[3px] left-[3px] rounded-[10px] bg-surface shadow-[0_1px_3px_rgb(0_0_0/0.12)]"
        style={{
          width: `calc((100% - 6px) / ${options.length})`,
          transform: `translateX(${index * 100}%)`,
          transition: 'transform 0.45s var(--spring)',
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
            className={`relative z-[1] flex min-h-10 items-center justify-center gap-1.5 px-1 text-[13px] transition-colors duration-200 ${on ? 'font-semibold text-ink' : 'font-medium text-muted'}`}
          >
            {o.label}
            {o.count !== undefined && (
              <span
                className={`num rounded-[9px] px-1.5 py-px text-[11px] ${on ? 'bg-soft text-accent' : 'bg-border text-muted'}`}
              >
                {o.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
