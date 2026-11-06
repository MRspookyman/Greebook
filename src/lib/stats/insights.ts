import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  endOfYear,
  getDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from 'date-fns'
import { fromISODate, toISODate } from '../dates'
import type { Reading, ReadingWithBook, Session } from '../types'
import { audioMinutes, pagesRead, sessionScore, type DateRange } from './aggregate'

export type Period = 'week' | 'month' | 'year'

const WEEK = { weekStartsOn: 1 } as const

/** Current week (Monday–Sunday), month or year containing `today`. */
export function periodRange(period: Period, today: string): DateRange {
  const d = fromISODate(today)
  switch (period) {
    case 'week':
      return { from: toISODate(startOfWeek(d, WEEK)), to: toISODate(endOfWeek(d, WEEK)) }
    case 'month':
      return { from: toISODate(startOfMonth(d)), to: toISODate(endOfMonth(d)) }
    case 'year':
      return { from: toISODate(startOfYear(d)), to: toISODate(endOfYear(d)) }
  }
}

/** The same period one step back (last week, last month, last year). */
export function previousRange(period: Period, today: string): DateRange {
  const d = fromISODate(today)
  const back = period === 'week' ? addWeeks(d, -1) : period === 'month' ? addMonths(d, -1) : addYears(d, -1)
  return periodRange(period, toISODate(back))
}

/** Relative change in %, rounded; null when there is no previous value to compare with. */
export function pctChange(current: number, previous: number): number | null {
  if (previous <= 0) return null
  return Math.round(((current - previous) / previous) * 100)
}

/** Monday..Sunday ISO dates of the week containing `today`. */
export function weekDays(today: string): string[] {
  const start = startOfWeek(fromISODate(today), WEEK)
  return Array.from({ length: 7 }, (_, i) => toISODate(addDays(start, i)))
}

export interface DayPoint {
  date: string
  pages: number
  audioMinutes: number
  /** pages + audioMinutes / 2 */
  score: number
}

/** One point per calendar day in `range` (inclusive), zeros on days without sessions. */
export function dailySeries(
  sessions: Session[],
  readings: Pick<Reading, 'id' | 'unit'>[],
  range: DateRange,
): DayPoint[] {
  const byId = new Map(readings.map((r) => [r.id, r]))
  const days = new Map<string, DayPoint>()
  for (const d of eachDayOfInterval({ start: fromISODate(range.from), end: fromISODate(range.to) })) {
    const date = toISODate(d)
    days.set(date, { date, pages: 0, audioMinutes: 0, score: 0 })
  }
  for (const s of sessions) {
    const point = days.get(s.read_on)
    const r = byId.get(s.reading_id)
    if (!point || !r) continue
    point.pages += pagesRead(s, r)
    point.audioMinutes += audioMinutes(s, r)
    point.score += sessionScore(s, r)
  }
  return [...days.values()]
}

/** Twelve monthly totals (index 0 = January) of the year containing `today`. */
export function monthlySeries(
  sessions: Session[],
  readings: Pick<Reading, 'id' | 'unit'>[],
  today: string,
): Omit<DayPoint, 'date'>[] {
  const year = today.slice(0, 4)
  const byId = new Map(readings.map((r) => [r.id, r]))
  const months = Array.from({ length: 12 }, () => ({ pages: 0, audioMinutes: 0, score: 0 }))
  for (const s of sessions) {
    if (!s.read_on.startsWith(year)) continue
    const r = byId.get(s.reading_id)
    if (!r) continue
    const m = months[Number(s.read_on.slice(5, 7)) - 1]
    m.pages += pagesRead(s, r)
    m.audioMinutes += audioMinutes(s, r)
    m.score += sessionScore(s, r)
  }
  return months
}

/**
 * Units advanced per calendar day since the first session of this reading (inclusive of today).
 * Null without sessions.
 */
export function pacePerDay(reading: Pick<Reading, 'id'>, sessions: Session[], today: string): number | null {
  const own = sessions.filter((s) => s.reading_id === reading.id)
  if (own.length === 0) return null
  const first = own.reduce((min, s) => (s.read_on < min ? s.read_on : min), own[0].read_on)
  const advanced = own.reduce((sum, s) => sum + s.end_pos - s.start_pos, 0)
  const days = Math.max(1, differenceInCalendarDays(fromISODate(today), fromISODate(first)) + 1)
  return advanced / days
}

/** Expected finish date at the current pace, or null without pace / when already finished. */
export function estimatedFinish(
  reading: Pick<Reading, 'id' | 'current_position' | 'total_units'>,
  sessions: Session[],
  today: string,
): string | null {
  const remaining = reading.total_units - reading.current_position
  const pace = pacePerDay(reading, sessions, today)
  if (remaining <= 0 || !pace) return null
  return toISODate(addDays(fromISODate(today), Math.ceil(remaining / pace)))
}

export interface GoalProjection {
  /** Books expected by year end at the current rate. */
  projected: number
  /** Date the goal is (or would be) reached; null when the pace doesn't get there this year. */
  reachOn: string | null
}

export function goalProjection(finishedThisYear: number, goal: number, today: string): GoalProjection {
  const d = fromISODate(today)
  const yearStart = startOfYear(d)
  const elapsed = differenceInCalendarDays(d, yearStart) + 1
  const total = differenceInCalendarDays(endOfYear(d), yearStart) + 1
  const rate = finishedThisYear / elapsed
  const projected = Math.round(rate * total)
  if (finishedThisYear >= goal) return { projected, reachOn: today }
  if (rate === 0) return { projected: 0, reachOn: null }
  const reach = addDays(yearStart, Math.ceil(goal / rate) - 1)
  return { projected, reachOn: reach <= endOfYear(d) ? toISODate(reach) : null }
}

const WEEKDAY_NAMES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

export interface BestWeekday {
  /** Spanish weekday name, lower case. */
  name: string
  /** How much more is read that day vs. the average of the other days, in %. Null if others are 0. */
  morePct: number | null
}

/** Weekday with the highest average score over the given sessions; null without data. */
export function bestWeekday(sessions: Session[], readings: Pick<Reading, 'id' | 'unit'>[]): BestWeekday | null {
  const byId = new Map(readings.map((r) => [r.id, r]))
  const totals = Array(7).fill(0) as number[]
  const dates = Array.from({ length: 7 }, () => new Set<string>())
  for (const s of sessions) {
    const r = byId.get(s.reading_id)
    if (!r) continue
    const wd = getDay(fromISODate(s.read_on))
    totals[wd] += sessionScore(s, r)
    dates[wd].add(s.read_on)
  }
  const avg = totals.map((t, i) => (dates[i].size ? t / dates[i].size : 0))
  let best = -1
  for (let i = 0; i < 7; i++) if (avg[i] > 0 && (best < 0 || avg[i] > avg[best])) best = i
  if (best < 0) return null
  const others = avg.filter((_, i) => i !== best && dates[i].size > 0)
  const othersAvg = others.length ? others.reduce((a, b) => a + b, 0) / others.length : 0
  return {
    name: WEEKDAY_NAMES[best],
    morePct: othersAvg > 0 ? Math.round(((avg[best] - othersAvg) / othersAvg) * 100) : null,
  }
}

/** Most frequent mood among finished readings in range, with how many books carry it. */
export function topMood(readings: ReadingWithBook[], range: DateRange): { mood: string; books: number } | null {
  const counts = new Map<string, number>()
  for (const r of readings) {
    if (r.status !== 'finished' || !r.finished_on || r.finished_on < range.from || r.finished_on > range.to) continue
    for (const m of r.moods) counts.set(m, (counts.get(m) ?? 0) + 1)
  }
  let top: { mood: string; books: number } | null = null
  for (const [mood, books] of counts) if (!top || books > top.books) top = { mood, books }
  return top
}
