import { MAX_MOODS, MOODS } from '@/config/moods'

interface Props {
  value: string[]
  /** Omit for read-only display of `value`. */
  onChange?: (v: string[]) => void
}

export function MoodChips({ value, onChange }: Props) {
  const chip = 'px-3 min-h-9 rounded-full text-sm border inline-flex items-center'
  if (!onChange) {
    return (
      <div className="flex flex-wrap gap-2">
        {value.map((m) => (
          <span key={m} className={`${chip} border-accent text-accent`}>
            {m}
          </span>
        ))}
      </div>
    )
  }
  const toggle = (m: string) =>
    onChange(value.includes(m) ? value.filter((x) => x !== m) : value.length < MAX_MOODS ? [...value, m] : value)
  return (
    <div className="flex flex-wrap gap-2">
      {MOODS.map((m) => {
        const on = value.includes(m)
        return (
          <button
            key={m}
            type="button"
            aria-pressed={on}
            onClick={() => toggle(m)}
            disabled={!on && value.length >= MAX_MOODS}
            className={`${chip} min-h-11 ${on ? 'bg-accent text-surface border-accent' : 'border-border text-ink disabled:opacity-40'}`}
          >
            {m}
          </button>
        )
      })}
    </div>
  )
}
