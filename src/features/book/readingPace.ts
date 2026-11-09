import { addDays } from 'date-fns'
import { fromISODate, toISODate } from '@/lib/dates'
import type { Reading, Session } from '@/lib/types'

type PaceReading = Pick<Reading, 'id' | 'status' | 'total_units' | 'current_position'>
type PaceSession = Pick<Session, 'reading_id' | 'read_on' | 'start_pos' | 'end_pos'>

/** Advance per active reading day; recent fortnight first, whole reading as fallback. */
export function readingPace(reading: PaceReading, sessions: readonly PaceSession[], today: string) {
  const all = sessions.filter((s) => s.reading_id === reading.id && s.read_on <= today && s.end_pos > s.start_pos)
  if (reading.status !== 'reading' || all.length < 2 || reading.current_position >= reading.total_units) return null
  const since = toISODate(addDays(fromISODate(today), -13))
  const recent = all.filter((s) => s.read_on >= since)
  const sample = recent.length >= 2 ? recent : all
  const days = new Set(sample.map((s) => s.read_on)).size
  const pace = sample.reduce((sum, s) => sum + s.end_pos - s.start_pos, 0) / days
  const daysLeft = Math.ceil((reading.total_units - reading.current_position) / pace)
  return { pace, daysLeft, finish: toISODate(addDays(fromISODate(today), daysLeft)) }
}
