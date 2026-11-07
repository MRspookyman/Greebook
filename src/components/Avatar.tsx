import type { Profile } from '@/lib/types'

/** Outlined initial, with an optional filled treatment for selected identities. */
export function Avatar({
  person,
  size = 38,
  filled = false,
}: {
  person: Pick<Profile, 'display_name' | 'accent'>
  size?: number
  filled?: boolean
}) {
  return (
    <span
      className="grid flex-none place-items-center rounded-full border font-serif font-normal"
      style={{
        width: size,
        height: size,
        fontSize: Math.max(12, size * 0.46),
        borderColor: `var(--${person.accent})`,
        color: filled ? 'var(--accent-contrast)' : `var(--${person.accent})`,
        background: filled ? `var(--${person.accent})` : 'transparent',
      }}
      aria-hidden
    >
      {person.display_name.charAt(0).toUpperCase()}
    </span>
  )
}
