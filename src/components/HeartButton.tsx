import { Heart } from 'lucide-react'

interface Props {
  on: boolean
  count?: number
  /** Omit for read-only display. */
  onToggle?: () => void
  label?: string
}

/** ❤️ reaction pill: pops when switched on. */
export function HeartButton({ on, count, onToggle, label = 'Me gusta' }: Props) {
  const cls = `flex min-h-9 items-center gap-1 rounded-full border px-2.5 text-xs transition-transform duration-300 [transition-timing-function:var(--spring)] ${
    on
      ? 'border-transparent bg-[color-mix(in_oklab,var(--danger)_14%,var(--surface))] text-danger'
      : 'border-border text-muted'
  }`
  const icon = (
    <Heart
      size={14}
      fill={on ? 'currentColor' : 'none'}
      style={on ? { animation: 'gb-pop 0.5s var(--spring)' } : undefined}
    />
  )
  if (!onToggle) {
    return (
      <span className={cls} aria-label={`${count ?? 0} reacciones`}>
        {icon}
        {count !== undefined && <span className="num">{count}</span>}
      </span>
    )
  }
  return (
    <button type="button" className={`${cls} active:scale-90`} aria-pressed={on} aria-label={label} onClick={onToggle}>
      {icon}
      {count !== undefined && <span className="num">{count}</span>}
    </button>
  )
}
