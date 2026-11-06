import type { ReadingWithBook, Session } from '@/lib/types'

/** Session activity takes precedence over metadata updates such as accepting a recommendation. */
export function recentReadings<R extends Pick<ReadingWithBook, 'id' | 'updated_at'>>(
  readings: R[],
  sessions: Pick<Session, 'reading_id' | 'created_at'>[],
): R[] {
  const latest = new Map<string, string>()
  for (const session of sessions) {
    if (session.created_at > (latest.get(session.reading_id) ?? '')) {
      latest.set(session.reading_id, session.created_at)
    }
  }
  return [...readings].sort(
    (a, b) =>
      (latest.get(b.id) ?? '').localeCompare(latest.get(a.id) ?? '') || b.updated_at.localeCompare(a.updated_at),
  )
}
