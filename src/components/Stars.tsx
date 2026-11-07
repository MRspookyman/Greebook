import { useId } from 'react'
import { Star } from 'lucide-react'

interface Props {
  value: number | null
  /** Omit for read-only display. */
  onChange?: (v: number) => void
  size?: number
}

const ratingFormat = new Intl.NumberFormat('es', { maximumFractionDigits: 1 })

/** Native half-step slider overlays the five stars, supporting touch and arrow keys. */
export function Stars({ value, onChange, size = 28 }: Props) {
  const id = useId()
  const v = value ?? 0
  const description = value ? `${ratingFormat.format(value)} de 5 estrellas` : 'Sin valorar'
  return (
    <div
      className="relative inline-flex rounded-lg focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent"
      role={onChange ? undefined : 'img'}
      aria-label={onChange ? undefined : description}
    >
      <div className="inline-flex" aria-hidden>
        {[0, 1, 2, 3, 4].map((i) => {
          const fill = Math.max(0, Math.min(1, v - i))
          return (
            <span key={i} className={onChange ? 'grid min-h-11 min-w-11 place-items-center' : 'inline-flex'}>
              <span className="relative inline-block" style={{ width: size, height: size }}>
                <Star
                  aria-hidden
                  size={size}
                  className="absolute inset-0 text-border"
                  fill="currentColor"
                  strokeWidth={0}
                />
                <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                  <Star aria-hidden size={size} className="text-accent" fill="currentColor" strokeWidth={0} />
                </span>
              </span>
            </span>
          )
        })}
      </div>
      {onChange && (
        <>
          <label className="sr-only" htmlFor={id}>
            Valoración
          </label>
          <input
            id={id}
            name="rating"
            type="range"
            min={0.5}
            max={5}
            step={0.5}
            value={value ?? 0.5}
            aria-valuetext={description}
            className="absolute inset-0 h-full min-h-11 w-full cursor-pointer opacity-0"
            onChange={(event) => onChange(event.currentTarget.valueAsNumber)}
          />
        </>
      )}
    </div>
  )
}
