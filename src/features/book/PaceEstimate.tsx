import type { ReadingWithBook } from '@/lib/types'
import { useSessions } from '@/lib/data'
import { fmt, todayISO } from '@/lib/dates'
import { formatPosition, percentOf } from '@/lib/units'
import { useMe } from '@/features/auth/me'
import { readingPace } from './readingPace'

/**
 * «50 % · lo acabas hacia el 21 nov»: progress and, once there are enough sessions, when you'll finish.
 * With `position` it leads with the page («p. 72 / 340») for rows that show no page elsewhere.
 */
export function ProgressLine({ reading, position = false }: { reading: ReadingWithBook; position?: boolean }) {
  const sessions = useSessions(reading.user_id)
  const estimate = readingPace(reading, sessions.data ?? [], todayISO())
  // A Kindle percentage is already its position; next to a page number, the percent says how far along.
  const parts = [
    position ? formatPosition(reading) : reading.unit === 'pages' ? `${percentOf(reading)} %` : null,
    estimate ? `lo acabas hacia el ${fmt(estimate.finish, 'd MMM')}` : null,
  ].filter(Boolean)
  if (!parts.length) return null
  return <p className="text-[13px] text-muted">{parts.join(' · ')}</p>
}

/** Your partner's place in the same book, in their colour, with their own finish date. */
export function PartnerPace({ theirs }: { theirs: ReadingWithBook }) {
  const { partner } = useMe()
  const sessions = useSessions(theirs.user_id)
  const estimate = readingPace(theirs, sessions.data ?? [], todayISO())
  if (!partner) return null
  return (
    <p className="flex items-center gap-1.5 text-[13px] text-muted">
      <span aria-hidden className="h-2 w-2 flex-none rounded-full" style={{ background: `var(--${partner.accent})` }} />
      <span className="min-w-0">
        {partner.display_name} · {formatPosition(theirs)}
        {estimate && ` · hacia el ${fmt(estimate.finish, 'd MMM')}`}
      </span>
    </p>
  )
}

export function TogetherEstimates({ mine, theirs }: { mine: ReadingWithBook; theirs: ReadingWithBook }) {
  const { partner } = useMe()
  const mySessions = useSessions(mine.user_id)
  const theirSessions = useSessions(theirs.user_id)
  const today = todayISO()
  const a = readingPace(mine, mySessions.data ?? [], today)
  const b = readingPace(theirs, theirSessions.data ?? [], today)
  if (!a || !b) return null
  return <p className="text-xs text-muted">A vuestro ritmo, {partner?.display_name ?? 'tu pareja'} acabará en ~{b.daysLeft} {b.daysLeft === 1 ? 'día' : 'días'}, tú en ~{a.daysLeft} {a.daysLeft === 1 ? 'día' : 'días'}. Cada cual a su paso.</p>
}
