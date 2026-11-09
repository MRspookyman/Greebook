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
 * UTC arithmetic advances calendar dates only, not timezone-offset instants, so client and Edge agree across DST.
 */
export function coupleStreak(mine: Set<string>, theirs: Set<string>, today: string): CoupleStreak {
  const all = [...new Set([...mine, ...theirs])].filter((d) => d <= today).sort()
  const wildcards = new Set<string>()
  const used = new Map<string, number>()
  let best = 0
  let run = 0
  if (all.length) {
    const day = new Date(`${all[0]}T00:00:00Z`)
    for (let date = all[0]; date <= today; day.setUTCDate(day.getUTCDate() + 1), date = day.toISOString().slice(0, 10)) {
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
