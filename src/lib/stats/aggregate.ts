import type { Reading, ReadingWithBook, Session } from '../types'

type SessionPos = Pick<Session, 'start_pos' | 'end_pos'>

type ProgressReading = Pick<Reading, 'unit'> & { book: Pick<ReadingWithBook['book'], 'page_count'> }

/** Estimated pages advanced, using the book's page count for Kindle percentages. */
export function pagesEquivalent(session: SessionPos, reading: ProgressReading): number {
  const delta = session.end_pos - session.start_pos
  return reading.unit === 'pages' ? delta : reading.book.page_count ? Math.round(delta / 100 * reading.book.page_count) : 0
}

/** Intensity only: 1 % ≈ 3 pages when Kindle page count is unknown; never used in page totals. */
const UNKNOWN_KINDLE_INTENSITY_PER_PERCENT = 3

/** Calendar intensity uses estimated pages, with an activity-only fallback for unknown Kindle lengths. */
export function sessionScore(session: SessionPos, reading: ProgressReading): number {
  if (reading.unit === 'percent' && !reading.book.page_count) {
    return (session.end_pos - session.start_pos) * UNKNOWN_KINDLE_INTENSITY_PER_PERCENT
  }
  return pagesEquivalent(session, reading)
}

export interface DateRange {
  /** inclusive 'yyyy-MM-dd' */
  from: string
  /** inclusive 'yyyy-MM-dd' */
  to: string
}

export interface Summary {
  pages: number
  /** Sum of the optional `minutes` recorded on sessions. */
  readingMinutes: number
  booksFinished: number
  activeDays: number
}

const inRange = (d: string, r: DateRange) => d >= r.from && d <= r.to

/** Only explicitly recorded session time counts as time spent reading. */
export function timeSpent(
  sessions: readonly Pick<Session, 'reading_id' | 'read_on' | 'minutes' | 'start_pos' | 'end_pos'>[],
  range: DateRange,
): number {
  let minutes = 0
  for (const session of sessions) {
    if (!inRange(session.read_on, range)) continue
    minutes += session.minutes ?? 0
  }
  return minutes
}

export function summarize(sessions: Session[], readings: ReadingWithBook[], range: DateRange): Summary {
  const byId = new Map(readings.map((r) => [r.id, r]))
  const days = new Set<string>()
  let pages = 0
  let readingMinutes = 0
  for (const s of sessions) {
    if (!inRange(s.read_on, range)) continue
    days.add(s.read_on)
    readingMinutes += s.minutes ?? 0
    const r = byId.get(s.reading_id)
    if (!r) continue
    pages += pagesEquivalent(s, r)
  }
  const booksFinished = readings.filter(
    (r) => r.status === 'finished' && r.finished_on != null && inRange(r.finished_on, range),
  ).length
  return { pages, readingMinutes, booksFinished, activeDays: days.size }
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
    const score = r ? sessionScore(s, r) : 0
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
