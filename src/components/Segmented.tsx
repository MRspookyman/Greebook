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
  variant?: 'pill' | 'underline'
}

/** Equal-width choices with a quiet moving selection or an editorial underline. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className = '',
  variant = 'pill',
  ...rest
}: Props<T>) {
  const index = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  )
  const underline = variant === 'underline'
  return (
    <div
      role="group"
      aria-label={rest['aria-label']}
      className={`relative grid ${underline ? 'border-b border-rule' : 'rounded-[6px] bg-soft p-[3px]'} ${className}`}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      <div
        aria-hidden
        className={`absolute ${underline ? 'bottom-[-1px] left-0 h-[2px] bg-accent' : 'top-[3px] bottom-[3px] left-[3px] rounded-[4px] bg-surface'}`}
        style={{
          width: underline ? `${100 / options.length}%` : `calc((100% - 6px) / ${options.length})`,
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
            className={`relative z-[1] flex min-h-11 items-center justify-center gap-1 px-1 text-[13px] transition-colors duration-150 ${on ? 'font-medium text-ink' : 'text-muted'}`}
          >
            {o.label}
            {o.count !== undefined && <span className="num text-xs">{o.count}</span>}
          </button>
        )
      })}
    </div>
  )
}
