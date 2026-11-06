import { addDays } from 'date-fns'
import { fromISODate, toISODate } from './dates'
import { currentStreak } from './stats/streak'
import type { Profile, Reading } from './types'

/** Pages between stops of the club de dos. Must match supabase/functions/notify-partner → stopStep. */
export function stopStep(totalPages: number): number {
  return totalPages >= 300 ? 100 : 50
}

/** Stop pages strictly inside the book: 100, 200, … (none for audio). */
export function clubStops(reading: Pick<Reading, 'unit' | 'total_units'>): number[] {
  if (reading.unit !== 'pages') return []
  const step = stopStep(reading.total_units)
  const stops: number[] = []
  for (let page = step; page < reading.total_units; page += step) stops.push(page)
  return stops
}

/** First stop that the given position hasn't reached yet. */
export function nextStop(reading: Pick<Reading, 'unit' | 'total_units' | 'current_position'>): number | null {
  return clubStops(reading).find((page) => page > reading.current_position) ?? null
}

/** Position in pages, converting audio progress through the book's page count when there is one. */
export function positionInPages(
  reading: Pick<Reading, 'unit' | 'total_units' | 'current_position' | 'status'>,
  pageCount: number | null,
): number | null {
  if (reading.unit === 'pages') return reading.current_position
  if (!pageCount || reading.total_units <= 0) return null
  return Math.round((reading.current_position / reading.total_units) * pageCount)
}

/** Days on which both of us read, counted like a normal streak. */
export function coupleStreak(mine: Set<string>, theirs: Set<string>, today: string): number {
  return currentStreak(new Set([...mine].filter((date) => theirs.has(date))), today)
}

/** A running timer older than this is treated as abandoned. */
export const LIVE_MS = 3 * 60 * 60 * 1000

export function isLive(person: Pick<Profile, 'reading_now_since' | 'reading_now_id'> | null, now = Date.now()) {
  if (!person?.reading_now_since || !person.reading_now_id) return false
  return now - new Date(person.reading_now_since).getTime() < LIVE_MS
}

/** 'yyyy-MM' of a local ISO date. */
export function monthOf(isoDate: string): string {
  return isoDate.slice(0, 7)
}

/** Ordered pair used as the couple key in `challenges`. */
export function couplePair(a: string, b: string): { user_a: string; user_b: string } {
  return a < b ? { user_a: a, user_b: b } : { user_a: b, user_b: a }
}

/** Next Sunday (or today if it is Sunday) as 'yyyy-MM-dd'. */
export function nextSunday(today: string): string {
  const date = fromISODate(today)
  return toISODate(addDays(date, (7 - date.getDay()) % 7))
}

/** Suggested monthly goal: the pair's average of the previous three months + 10 %, rounded to 50. */
export function suggestedGoal(pagesByMonth: number[]): number {
  const months = pagesByMonth.filter((pages) => pages > 0)
  if (!months.length) return 1000
  const average = months.reduce((sum, pages) => sum + pages, 0) / months.length
  return Math.max(100, Math.round((average * 1.1) / 50) * 50)
}
