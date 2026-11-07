import { useEntered } from './motion'

interface Props {
  /** 0..1 */
  value: number
  /** CSS color, default the user's accent. */
  color?: string
  className?: string
  label?: string
}

/** Bar that fills from zero when it appears and eases to new values. */
export function ProgressBar({
  value,
  color = 'var(--accent)',
  className = 'h-[6px]',
  label = 'Progreso de lectura',
}: Props) {
  const entered = useEntered()
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100)
  return (
    <div
      className={`relative overflow-hidden rounded-full ${className}`}
      style={{ background: `color-mix(in oklab, ${color} 16%, var(--track))` }}
      role="progressbar"
      aria-label={label}
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="absolute inset-0 origin-left rounded-full"
        style={{
          transform: `scaleX(${entered ? pct / 100 : 0})`,
          background: color,
          transition: 'transform var(--dur-fill) var(--ease)',
        }}
      />
    </div>
  )
}
