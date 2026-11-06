import type { Book, Reading, ReadingWithBook, Session } from '../types'

type SessionPos = Pick<Session, 'start_pos' | 'end_pos'>

/** Pages read in a session; percent converts via the book's page count; audio counts 0. */
export function pagesEquivalent(
  session: SessionPos,
  reading: Pick<Reading, 'unit'>,
  book: Pick<Book, 'page_count'>,
): number {
  const delta = session.end_pos - session.start_pos
  switch (reading.unit) {
    case 'pages':
      return delta
    case 'percent':
      return book.page_count ? Math.round((delta / 100) * book.page_count) : 0
    case 'minutes':
      return 0
  }
}

/** Minutes listened in a session (audio readings only). */
export function audioMinutes(session: SessionPos, reading: Pick<Reading, 'unit'>): number {
  return reading.unit === 'minutes' ? session.end_pos - session.start_pos : 0
}

/** Intensity score of a session: 1 page ≈ 2 minutes of listening. */
export function sessionScore(
  session: SessionPos,
  reading: Pick<Reading, 'unit'>,
  book: Pick<Book, 'page_count'>,
): number {
  return pagesEquivalent(session, reading, book) + audioMinutes(session, reading) / 2
}

export interface DateRange {
  /** inclusive 'yyyy-MM-dd' */
  from: string
  /** inclusive 'yyyy-MM-dd' */
  to: string
}

export interface Summary {
  pages: number
  audioMinutes: number
  /** Sum of the optional `minutes` recorded on sessions. */
  readingMinutes: number
  booksFinished: number
  activeDays: number
}

const inRange = (d: string, r: DateRange) => d >= r.from && d <= r.to

export function summarize(sessions: Session[], readings: ReadingWithBook[], range: DateRange): Summary {
  const byId = new Map(readings.map((r) => [r.id, r]))
  const days = new Set<string>()
  let pages = 0
  let audio = 0
  let readingMinutes = 0
  for (const s of sessions) {
    if (!inRange(s.read_on, range)) continue
    days.add(s.read_on)
    readingMinutes += s.minutes ?? 0
    const r = byId.get(s.reading_id)
    if (!r) continue
    pages += pagesEquivalent(s, r, r.book)
    audio += audioMinutes(s, r)
  }
  const booksFinished = readings.filter(
    (r) => r.status === 'finished' && r.finished_on != null && inRange(r.finished_on, range),
  ).length
  return { pages, audioMinutes: audio, readingMinutes, booksFinished, activeDays: days.size }
}

export interface DayActivity {
  /** Sum of session scores for the day. */
  score: number
  /** Reading with the highest score that day. */
  topReadingId: string
  /** Distinct readings with sessions that day. */
  readingCount: number
}

/** Per-day activity keyed by `read_on`. */
export function activityByDay(sessions: Session[], readings: ReadingWithBook[]): Map<string, DayActivity> {
  const byId = new Map(readings.map((r) => [r.id, r]))
  const perDay = new Map<string, Map<string, number>>()
  for (const s of sessions) {
    const r = byId.get(s.reading_id)
    const score = r ? sessionScore(s, r, r.book) : 0
    const day = perDay.get(s.read_on) ?? new Map<string, number>()
    day.set(s.reading_id, (day.get(s.reading_id) ?? 0) + score)
    perDay.set(s.read_on, day)
  }
  const out = new Map<string, DayActivity>()
  for (const [date, perReading] of perDay) {
    let total = 0
    let top = ''
    let topScore = -1
    for (const [readingId, score] of perReading) {
      total += score
      if (score > topScore) {
        topScore = score
        top = readingId
      }
    }
    out.set(date, { score: total, topReadingId: top, readingCount: perReading.size })
  }
  return out
}
