import type { MouseEvent } from 'react'
import { Star } from 'lucide-react'

interface Props {
  value: number | null
  /** Omit for read-only display. */
  onChange?: (v: number) => void
  size?: number
}

/** 5-star rating with halves: tapping the left half of a star sets x.5. */
export function Stars({ value, onChange, size = 28 }: Props) {
  const v = value ?? 0
  const pick = (i: number) => (e: MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const half = e.clientX - rect.left < rect.width / 2
    onChange?.(i + (half ? 0.5 : 1))
  }
  return (
    <div
      className="inline-flex"
      role={onChange ? 'radiogroup' : 'img'}
      aria-label={value ? `${String(value).replace('.', ',')} de 5 estrellas` : 'Sin valorar'}
    >
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = Math.max(0, Math.min(1, v - i))
        const icon = (
          <span className="relative inline-block" style={{ width: size, height: size }}>
            <Star size={size} className="absolute inset-0 text-border" fill="currentColor" strokeWidth={0} />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Star size={size} className="text-accent" fill="currentColor" strokeWidth={0} />
            </span>
          </span>
        )
        return onChange ? (
          <button key={i} type="button" className="p-1" onClick={pick(i)} aria-label={`${i + 1} estrellas`}>
            {icon}
          </button>
        ) : (
          <span key={i}>{icon}</span>
        )
      })}
    </div>
  )
}
