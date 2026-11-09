import type { Session } from '@/lib/types'

/** The day a book was finished: when its last session was read, or today if there is none. */
export function finishDay(sessions: readonly Pick<Session, 'reading_id' | 'read_on'>[], readingId: string, today: string): string {
  return sessions.reduce<string | null>(
    (latest, session) =>
      session.reading_id === readingId && session.read_on <= today && (!latest || session.read_on > latest)
        ? session.read_on
        : latest,
    null,
  ) ?? today
}
