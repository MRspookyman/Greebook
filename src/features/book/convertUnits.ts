import type { Session } from '@/lib/types'

/** Mirrors PostgreSQL round for the non-negative positions stored by the reader. */
export function convertPosition(position: number, oldTotal: number, newTotal: number) {
  return Math.round(position * newTotal / oldTotal)
}

/** Sessions with progress that lose it when rounded to the new unit (time-only sessions are kept as they are). */
export function collapsedSessionCount(sessions: readonly Pick<Session, 'start_pos' | 'end_pos'>[], oldTotal: number, newTotal: number) {
  return sessions.filter((s) => s.end_pos > s.start_pos && convertPosition(s.end_pos, oldTotal, newTotal) <= convertPosition(s.start_pos, oldTotal, newTotal)).length
}
