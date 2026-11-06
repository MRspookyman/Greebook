import type { Profile } from '@/lib/types'

/** Initial in a circle of the person's color. */
export function Avatar({ person, size = 38 }: { person: Pick<Profile, 'display_name' | 'accent'>; size?: number }) {
  return (
    <span
      className="grid flex-none place-items-center rounded-full font-semibold text-surface"
      style={{ width: size, height: size, fontSize: size * 0.37, background: `var(--${person.accent})` }}
      aria-hidden
    >
      {person.display_name.charAt(0).toUpperCase()}
    </span>
  )
}
