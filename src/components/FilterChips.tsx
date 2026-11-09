interface Props<T extends string> {
  options: readonly { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  'aria-label': string
}

export function FilterChips<T extends string>({ options, value, onChange, ...rest }: Props<T>) {
  return (
    <div role="group" aria-label={rest['aria-label']} className="flex gap-2 overflow-x-auto py-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={`min-h-11 shrink-0 rounded-full border px-4 text-sm transition-colors ${value === option.value ? 'border-accent bg-soft font-medium text-accent' : 'border-rule bg-surface text-muted'}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
