interface Props<T extends string> {
  options: readonly { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  'aria-label': string
  /** One row that scrolls edge to edge of the screen, fading at both ends; otherwise the chips wrap (e.g. in sheets). */
  bleed?: boolean
}

/** One choice among a few, as the same round chips used across the app. */
export function FilterChips<T extends string>({ options, value, onChange, bleed = false, ...rest }: Props<T>) {
  return (
    <div
      role="group"
      aria-label={rest['aria-label']}
      className={`flex gap-2 py-0.5 ${bleed ? 'no-scrollbar fade-x -mx-5 overflow-x-auto px-5' : 'flex-wrap'}`}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className="chip shrink-0"
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
