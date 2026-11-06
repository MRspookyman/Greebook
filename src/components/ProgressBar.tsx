import { useEntered } from './motion'

interface Props {
  /** 0..1 */
  value: number
  /** CSS color, default the user's accent. */
  color?: string
  className?: string
}

/** Bar that fills from zero when it appears and eases to new values. */
export function ProgressBar({ value, color = 'var(--accent)', className = 'h-2' }: Props) {
  const entered = useEntered()
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100)
  return (
    <div
      className={`relative overflow-hidden rounded-[9px] bg-border ${className}`}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="absolute inset-y-0 left-0 rounded-[9px]"
        style={{ width: entered ? `${pct}%` : 0, background: color, transition: 'width 1s var(--ease)' }}
      />
    </div>
  )
}
