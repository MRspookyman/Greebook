import type { Session } from '@/lib/types'

/** Mirrors PostgreSQL round for the non-negative positions stored by the reader. */
export function convertPosition(position: number, oldTotal: number, newTotal: number) {
  return Math.round(position * newTotal / oldTotal)
}

export function collapsedSessionCount(sessions: readonly Pick<Session, 'start_pos' | 'end_pos'>[], oldTotal: number, newTotal: number) {
  return sessions.filter((s) => convertPosition(s.end_pos, oldTotal, newTotal) <= convertPosition(s.start_pos, oldTotal, newTotal)).length
}
