import { addDays, differenceInCalendarDays } from 'date-fns'
import { fromISODate, toISODate } from '../dates'

/**
 * Consecutive days with at least one session ending today, or yesterday if there is
 * no session today yet (the streak isn't broken until the day ends).
 * `dates` are local 'yyyy-MM-dd' (`read_on`), `today` likewise.
 */
export function currentStreak(dates: Set<string>, today: string): number {
  let day = fromISODate(today)
  if (!dates.has(today)) day = addDays(day, -1)
  let n = 0
  while (dates.has(toISODate(day))) {
    n++
    day = addDays(day, -1)
  }
  return n
}

export function bestStreak(dates: Set<string>): number {
  const sorted = [...dates].sort()
  let best = 0
  let run = 0
  let prev: Date | null = null
  for (const s of sorted) {
    const d = fromISODate(s)
    run = prev && differenceInCalendarDays(d, prev) === 1 ? run + 1 : 1
    best = Math.max(best, run)
    prev = d
  }
  return best
}

/**
 * Consecutive days on which both of you read, ending today (or yesterday while today is still open for one of
 * you). Each set holds that person's local reading dates.
 */
export function sharedStreak(mine: Set<string>, theirs: Set<string>, today: string): number {
  const both = new Set([...mine].filter((date) => theirs.has(date)))
  return currentStreak(both, today)
}

export const WILDCARDS_PER_MONTH = 2

export interface CoupleStreak {
  /** Days in a row counted for both of you (wildcard days included), up to today or yesterday. */
  current: number
  best: number
  /** Days covered by a wildcard because only one of you read. */
  wildcards: Set<string>
  /** Wildcards spent in today's month. */
  wildcardsThisMonth: number
  /** Today still counts once the missing one reads. */
  todayPending: boolean
}

/**
 * The streak of both of you. A day counts when both read; when only one did, one of the month's two wildcards
 * covers it automatically; when nobody read, the streak starts again. Today never breaks it: it is pending until
 * the day ends. Dates are each person's local 'yyyy-MM-dd'.
 */
export function coupleStreak(mine: Set<string>, theirs: Set<string>, today: string): CoupleStreak {
  const all = [...new Set([...mine, ...theirs])].filter((d) => d <= today).sort()
  const wildcards = new Set<string>()
  const used = new Map<string, number>()
  let best = 0
  let run = 0
  if (all.length) {
    for (let day = fromISODate(all[0]); toISODate(day) <= today; day = addDays(day, 1)) {
      const date = toISODate(day)
      const a = mine.has(date)
      const b = theirs.has(date)
      if (a && b) run++
      else if (date === today) break
      else if (a || b) {
        const month = date.slice(0, 7)
        const spent = used.get(month) ?? 0
        if (spent < WILDCARDS_PER_MONTH) {
          used.set(month, spent + 1)
          wildcards.add(date)
          run++
        } else run = 0
      } else run = 0
      best = Math.max(best, run)
    }
  }
  const bothToday = mine.has(today) && theirs.has(today)
  return {
    current: run,
    best,
    wildcards,
    wildcardsThisMonth: used.get(today.slice(0, 7)) ?? 0,
    todayPending: !bothToday,
  }
}
