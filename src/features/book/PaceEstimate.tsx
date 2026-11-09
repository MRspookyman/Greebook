import type { ReadingWithBook } from '@/lib/types'
import { useSessions } from '@/lib/data'
import { fmt, todayISO } from '@/lib/dates'
import { useMe } from '@/features/auth/me'
import { readingPace } from './readingPace'

export function PaceEstimate({ reading }: { reading: ReadingWithBook }) {
  const sessions = useSessions(reading.user_id)
  const estimate = readingPace(reading, sessions.data ?? [], todayISO())
  if (!estimate) return null
  const pace = Math.round(estimate.pace * 10) / 10
  return <p className="text-xs text-muted">Al ritmo de {pace.toLocaleString('es-ES')} {reading.unit === 'pages' ? 'p.' : '%'}/día lo terminas hacia el {fmt(estimate.finish, "d 'de' MMMM")}.</p>
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
