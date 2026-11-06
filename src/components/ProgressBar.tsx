interface Props {
  /** 0..1 */
  value: number
  /** CSS color, default the user's accent. */
  color?: string
  className?: string
}

export function ProgressBar({ value, color = 'var(--accent)', className = '' }: Props) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100)
  return (
    <div
      className={`h-2 rounded-full bg-border overflow-hidden ${className}`}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full transition-[width] duration-300"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  )
}
