import type { Profile } from '@/lib/types'

/**
 * A person's initial on a tint of their colour. `live` lights it like a reading lamp: only while that person is
 * reading right now.
 */
export function Avatar({
  person,
  size = 38,
  filled = false,
  live = false,
}: {
  person: Pick<Profile, 'display_name' | 'accent'>
  size?: number
  filled?: boolean
  live?: boolean
}) {
  const color = `var(--${person.accent})`
  return (
    <span
      className={`relative grid flex-none place-items-center rounded-full font-serif leading-none ${live ? 'lamp-glow' : ''}`}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(12, Math.round(size * 0.46)),
        color: filled ? 'var(--accent-contrast)' : color,
        background: filled ? color : `color-mix(in oklab, ${color} 15%, var(--surface))`,
        boxShadow: `inset 0 0 0 2px ${color}`,
      }}
      aria-hidden
    >
      {person.display_name.charAt(0).toUpperCase()}
      {live && (
        <span
          className="absolute right-[-1px] bottom-[-1px] rounded-full bg-amber ring-2 ring-surface"
          style={{ width: Math.max(10, size * 0.3), height: Math.max(10, size * 0.3) }}
        />
      )}
    </span>
  )
}
