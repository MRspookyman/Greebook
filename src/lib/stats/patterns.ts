import { addDays, format, startOfWeek } from 'date-fns'
import type { ReadingWithBook, Session } from '../types'
import { pagesEquivalent } from './aggregate'

export const TIME_BANDS = ['Madrugada', 'Mañana', 'Tarde', 'Noche'] as const
export const BAND_HOURS = ['0–5 h', '6–11 h', '12–19 h', '20–23 h'] as const
export const BAND_SUMMARIES = ['de madrugada', 'por la mañana', 'por la tarde', 'por la noche'] as const

/** Actual start instant in the reader's timezone, not the browser's timezone or UTC. */
export function readingHabits(sessions: readonly Pick<Session, 'started_at'>[], timezone: string) {
  const cells = Array.from({ length: 4 }, () => Array<number>(7).fill(0))
  const formatter = new Intl.DateTimeFormat('en-US', { timeZone: timezone, weekday: 'short', hour: 'numeric', hourCycle: 'h23' })
  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  let count = 0
  for (const session of sessions) {
    if (!session.started_at) continue
    const instant = new Date(session.started_at)
    if (!Number.isFinite(instant.getTime())) continue
    const parts = formatter.formatToParts(instant)
    const weekday = weekdays.indexOf(parts.find((part) => part.type === 'weekday')?.value ?? '')
    const hour = Number(parts.find((part) => part.type === 'hour')?.value)
    if (weekday < 0 || !Number.isFinite(hour)) continue
    const band = hour < 6 ? 0 : hour < 12 ? 1 : hour < 20 ? 2 : 3
    cells[band][weekday]++
    count++
  }
  const totals = cells.map((row) => row.reduce((sum, value) => sum + value, 0))
  const max = Math.max(...totals)
  const dominant = count && totals.filter((value) => value === max).length === 1 ? totals.indexOf(max) : null
  return { cells, count, dominant, max: Math.max(1, ...cells.flat()) }
}

export interface SpeedSample { sessions: number; pages: number; minutes: number; pagesPerHour: number }

/** Weighted speed: total pages / total time, never an average of session speeds. */
export function readingSpeed(sessions: readonly Pick<Session, 'reading_id' | 'minutes' | 'start_pos' | 'end_pos'>[], readings: readonly ReadingWithBook[]) {
  const byId = new Map(readings.map((reading) => [reading.id, reading]))
  const empty = (): SpeedSample => ({ sessions: 0, pages: 0, minutes: 0, pagesPerHour: 0 })
  const result = { overall: empty(), paper: empty(), ebook: empty() }
  for (const session of sessions) {
    const reading = byId.get(session.reading_id)
    if (!reading || !session.minutes || session.minutes <= 0) continue
    const pages = pagesEquivalent(session, reading)
    if (pages <= 0) continue
    for (const sample of [result.overall, result[reading.format]]) {
      sample.sessions++
      sample.pages += pages
      sample.minutes += session.minutes
    }
  }
  for (const sample of Object.values(result)) sample.pagesPerHour = sample.minutes ? sample.pages * 60 / sample.minutes : 0
  return result
}

/** Monday-first complete weeks; some leap years need 54 columns to retain every day. */
export function yearDays(year: number): (string | null)[][] {
  const first = startOfWeek(new Date(year, 0, 1), { weekStartsOn: 1 })
  const last = new Date(year, 11, 31)
  const weeks: (string | null)[][] = []
  for (let week = first; week <= last; week = addDays(week, 7)) {
    weeks.push(Array.from({ length: 7 }, (_, index) => {
      const date = addDays(week, index)
      return date.getFullYear() === year ? format(date, 'yyyy-MM-dd') : null
    }))
  }
  return weeks
}
