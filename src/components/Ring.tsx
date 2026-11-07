import type { ReactNode } from 'react'
import { useEntered } from './motion'

interface Props {
  /** 0..1 */
  value: number
  size?: number
  stroke?: number
  color?: string
  children?: ReactNode
  label?: string
}

/** Progress ring that fills from zero on mount. */
export function Ring({ value, size = 76, stroke = 3, color = 'var(--accent)', children, label }: Props) {
  const entered = useEntered()
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const v = Math.min(1, Math.max(0, value))
  return (
    <div
      className="relative grid flex-none place-items-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={label ?? `${Math.round(v * 100)} %`}
    >
      <svg width={size} height={size} className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={entered ? c * (1 - v) : c}
          style={{ transition: 'stroke-dashoffset var(--dur-fill) var(--ease)' }}
        />
      </svg>
      {children && <div className="relative text-center">{children}</div>}
    </div>
  )
}
