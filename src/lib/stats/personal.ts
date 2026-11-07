import type { Reading, Session } from '../types'

type SessionLike = Pick<Session, 'reading_id' | 'start_pos' | 'end_pos' | 'minutes'>

/** Minutes spent on a reading: the recorded time, or the audio advanced when no time was recorded. */
export function readingMinutes(reading: Pick<Reading, 'id' | 'unit'>, sessions: readonly SessionLike[]): number {
  let total = 0
  for (const session of sessions) {
    if (session.reading_id !== reading.id) continue
    total += session.minutes ?? (reading.unit === 'minutes' ? session.end_pos - session.start_pos : 0)
  }
  return total
}

/**
 * Pages per hour over paper sessions that recorded their time.
 * Null with less than 10 timed minutes: too little to call it a pace.
 */
export function pagesPerHour(
  readings: readonly Pick<Reading, 'id' | 'unit'>[],
  sessions: readonly SessionLike[],
): number | null {
  const paper = new Set(readings.filter((reading) => reading.unit === 'pages').map((reading) => reading.id))
  let pages = 0
  let minutes = 0
  for (const session of sessions) {
    if (!paper.has(session.reading_id) || !session.minutes) continue
    pages += session.end_pos - session.start_pos
    minutes += session.minutes
  }
  return minutes >= 10 ? (pages / minutes) * 60 : null
}

/**
 * Minutes left to finish. Audio is exact; paper uses the pace on this book,
 * or the given overall pace when this book has no timed sessions yet.
 */
export function minutesLeft(
  reading: Pick<Reading, 'id' | 'unit' | 'current_position' | 'total_units'>,
  sessions: readonly SessionLike[],
  overallPace: number | null = null,
): number | null {
  const left = reading.total_units - reading.current_position
  if (left <= 0) return 0
  if (reading.unit === 'minutes') return left
  const pace = pagesPerHour([reading], sessions) ?? overallPace
  return pace ? Math.round((left / pace) * 60) : null
}

/** A friendly estimate: «unos 40 min», «una hora», «unas 2,5 h», «unas 13 h». */
export function roughDuration(minutes: number): string {
  if (minutes < 50) return `unos ${Math.max(5, Math.round(minutes / 5) * 5)} min`
  const hours = minutes / 60
  const rounded = hours < 10 ? Math.round(hours * 2) / 2 : Math.round(hours)
  if (rounded === 1) return 'una hora'
  return `unas ${rounded.toLocaleString('es')} h`
}
