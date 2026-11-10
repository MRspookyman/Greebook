import { Star } from './icons'

/** One to five stars; tapping the one already set clears it. */
export function Stars({ value, onChange }: { value: number | null; onChange: (value: number | null) => void }) {
  return (
    <div role="radiogroup" aria-label="Cuánto te ha gustado" className="-ml-2 flex">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={n === 1 ? 'Una estrella' : `${n} estrellas`}
          className="grid h-12 w-12 place-items-center text-flame-ink transition-transform active:scale-90"
          onClick={() => onChange(value === n ? null : n)}
        >
          <Star size={30} filled={(value ?? 0) >= n} />
        </button>
      ))}
    </div>
  )
}
