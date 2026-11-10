import type { Session } from './types'
import { addDays } from './time'

/** The nights on which a person read. */
export function nightsOf(sessions: Session[], userId: string): Set<string> {
  const days = new Set<string>()
  for (const s of sessions) if (s.user_id === userId && !s.deleted_at) days.add(s.day)
  return days
}

/** Nights on which both read, oldest first. This only ever grows: nothing here can be «broken». */
export function sharedNights(mine: Set<string>, theirs: Set<string>): string[] {
  return [...mine].filter((day) => theirs.has(day)).sort()
}

/**
 * How many nights in a row end tonight (or last night, while tonight is still open).
 * Shown only as a small aside when it is worth mentioning; never as something to protect.
 */
export function runEndingAt(days: Set<string>, tonight: string): number {
  let day = days.has(tonight) ? tonight : addDays(tonight, -1)
  let n = 0
  while (days.has(day)) {
    n++
    day = addDays(day, -1)
  }
  return n
}

/** «37 noches leyendo los dos», with the run as an aside from 3 on. */
export function nightsLine(shared: string[], tonight: string): string | null {
  if (!shared.length) return null
  const run = runEndingAt(new Set(shared), tonight)
  const total = shared.length === 1 ? 'Una noche leyendo los dos' : `${shared.length} noches leyendo los dos`
  return run >= 3 && run < shared.length ? `${total} · ${run} seguidas` : total
}
