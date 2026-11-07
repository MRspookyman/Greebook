import { Heart } from 'lucide-react'

interface Props {
  on: boolean
  count?: number
  /** Omit for read-only display. */
  onToggle?: () => void
  label?: string
}

/** Quiet reaction control with a full-size touch target. */
export function HeartButton({ on, count, onToggle, label = 'Me gusta' }: Props) {
  const cls = `pressable flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-[6px] border px-2.5 text-xs ${
    on
      ? 'border-transparent bg-[color-mix(in_oklab,var(--danger)_14%,var(--surface))] text-ink'
      : 'border-border text-muted'
  }`
  const icon = (
    <Heart
      aria-hidden
      className={on ? 'text-danger' : undefined}
      size={14}
      fill={on ? 'currentColor' : 'none'}
      style={{ transition: 'fill 140ms var(--ease)' }}
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
    <button type="button" className={cls} aria-pressed={on} aria-label={label} onClick={onToggle}>
      {icon}
      {count !== undefined && <span className="num">{count}</span>}
    </button>
  )
}
