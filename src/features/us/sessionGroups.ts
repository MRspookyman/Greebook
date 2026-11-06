import type { ReadingWithBook, Session } from '@/lib/types'

/** Merge adjacent sessions for the same book and local day, retaining the newest reaction target. */
export function sessionGroups<
  S extends Pick<Session, 'reading_id' | 'created_at' | 'read_on' | 'start_pos' | 'end_pos'>,
  R extends Pick<ReadingWithBook, 'id' | 'book_id' | 'unit'>,
>(sessions: S[], readings: R[]) {
  const byId = new Map(readings.map((reading) => [reading.id, reading]))
  const groups: { session: S; reading: R; delta: number }[] = []
  for (const session of [...sessions].sort((a, b) => b.created_at.localeCompare(a.created_at))) {
    const reading = byId.get(session.reading_id)
    if (!reading) continue
    const previous = groups.at(-1)
    const delta = session.end_pos - session.start_pos
    if (
      previous &&
      previous.reading.book_id === reading.book_id &&
      previous.reading.unit === reading.unit &&
      previous.session.read_on === session.read_on
    ) {
      previous.delta += delta
    } else {
      groups.push({ session, reading, delta })
    }
  }
  return groups
}
