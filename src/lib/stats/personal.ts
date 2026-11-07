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

export type DayPart = 'morning' | 'afternoon' | 'evening' | 'night'
export const DAY_PARTS: { value: DayPart; label: string; hours: string }[] = [
  { value: 'morning', label: 'Mañana', hours: '7–14 h' },
  { value: 'afternoon', label: 'Tarde', hours: '14–20 h' },
  { value: 'evening', label: 'Noche', hours: '20–1 h' },
  { value: 'night', label: 'Madrugada', hours: '1–7 h' },
]

/** Hour a session started: saved time minus its minutes (sessions are saved when they end). */
function startHour(session: Pick<Session, 'created_at' | 'minutes'>): number {
  const end = new Date(session.created_at)
  return new Date(end.getTime() - (session.minutes ?? 0) * 60_000).getHours()
}

/** Share of sessions by part of the day (0..1 each), or null without sessions. */
export function timeOfDay(
  sessions: readonly Pick<Session, 'created_at' | 'minutes'>[],
): Record<DayPart, number> | null {
  if (!sessions.length) return null
  const counts: Record<DayPart, number> = { morning: 0, afternoon: 0, evening: 0, night: 0 }
  for (const session of sessions) {
    const h = startHour(session)
    const part: DayPart = h >= 7 && h < 14 ? 'morning' : h >= 14 && h < 20 ? 'afternoon' : h >= 20 || h < 1 ? 'evening' : 'night'
    counts[part] += 1
  }
  for (const key of Object.keys(counts) as DayPart[]) counts[key] /= sessions.length
  return counts
}

export interface Records {
  longestSession: { minutes: number; date: string } | null
  bestDay: { pages: number; date: string } | null
  fastestBook: { title: string; days: number } | null
}

/** Personal bests: the longest timed session, the most pages in a day and the quickest finished book. */
export function records(
  sessions: readonly Pick<Session, 'reading_id' | 'read_on' | 'start_pos' | 'end_pos' | 'minutes'>[],
  readings: readonly (Pick<Reading, 'id' | 'unit' | 'status' | 'started_on' | 'finished_on'> & { book: { title: string } })[],
): Records {
  const paper = new Set(readings.filter((r) => r.unit === 'pages').map((r) => r.id))
  let longestSession: Records['longestSession'] = null
  const pagesByDay = new Map<string, number>()
  for (const s of sessions) {
    if (s.minutes && (!longestSession || s.minutes > longestSession.minutes))
      longestSession = { minutes: s.minutes, date: s.read_on }
    if (paper.has(s.reading_id)) pagesByDay.set(s.read_on, (pagesByDay.get(s.read_on) ?? 0) + s.end_pos - s.start_pos)
  }
  let bestDay: Records['bestDay'] = null
  for (const [date, pages] of pagesByDay) if (!bestDay || pages > bestDay.pages) bestDay = { pages, date }
  let fastestBook: Records['fastestBook'] = null
  for (const r of readings) {
    if (r.status !== 'finished' || !r.started_on || !r.finished_on) continue
    const days = Math.round((Date.parse(r.finished_on) - Date.parse(r.started_on)) / 86_400_000) + 1
    if (!fastestBook || days < fastestBook.days) fastestBook = { title: r.book.title, days }
  }
  return { longestSession, bestDay, fastestBook }
}
