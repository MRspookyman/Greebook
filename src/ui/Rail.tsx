import { progressOf } from '@/lib/model'
import type { Reading } from '@/lib/types'

interface Props {
  mine?: Reading
  theirs?: Reading
}

/** The book as a line, with a ribbon where each of you is. */
export function Rail({ mine, theirs }: Props) {
  const marks = [
    theirs && { at: progressOf(theirs), color: 'var(--you)' },
    mine && { at: progressOf(mine), color: 'var(--me)' },
  ].filter((m): m is { at: number; color: string } => !!m)
  const furthest = Math.max(0, ...marks.map((m) => m.at))
  return (
    <div className="relative h-5" aria-hidden>
      <div className="absolute inset-x-0 top-[9px] h-[3px] rounded-full bg-rule" />
      <div
        className="absolute top-[9px] left-0 h-[3px] rounded-full bg-ink/35"
        style={{ width: `${furthest * 100}%`, transition: 'width 900ms var(--ease)' }}
      />
      {marks.map((mark, i) => (
        <span
          key={i}
          className="absolute top-0 h-5 w-[7px] -translate-x-1/2 rounded-[2px]"
          style={{
            left: `clamp(4px, ${mark.at * 100}%, calc(100% - 4px))`,
            background: mark.color,
            boxShadow: '0 1px 3px rgb(0 0 0 / 0.4)',
            clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 78%, 0 100%)',
            transition: 'left 900ms var(--ease)',
          }}
        />
      ))}
    </div>
  )
}
