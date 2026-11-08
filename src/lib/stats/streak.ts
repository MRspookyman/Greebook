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
