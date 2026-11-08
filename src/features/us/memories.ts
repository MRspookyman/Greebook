import type { Book, Invite, Quote, Reaction, ReadingWithBook, Session } from '@/lib/types'

type Kept = Pick<Quote, 'id' | 'locked' | 'body' | 'created_at'>

export function localMonth(timestamp: string): string {
  const date = new Date(timestamp)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export interface MonthMemories {
  month: string
  books: Book[]
  daysTogether: number
  ratitos: number
  quotes: Kept[]
}

/** Sessions use local diary dates; invitations/messages use the viewer's local calendar. */
export function monthMemories(
  month: string,
  readings: ReadingWithBook[],
  sessions: Session[],
  invites: Invite[],
  messages: Kept[],
  reactions: Reaction[],
  userId: string,
  partnerId: string,
): MonthMemories {
  const mine = new Set(
    sessions.filter((s) => s.user_id === userId && s.read_on.startsWith(month)).map((s) => s.read_on),
  )
  const theirs = new Set(
    sessions.filter((s) => s.user_id === partnerId && s.read_on.startsWith(month)).map((s) => s.read_on),
  )
  const books = new Map<string, Book>()
  for (const reading of readings) {
    if (reading.status === 'finished' && reading.finished_on?.startsWith(month))
      books.set(reading.book_id, reading.book)
  }
  const loved = new Set(reactions.map((reaction) => reaction.target_id))
  return {
    month,
    books: [...books.values()],
    daysTogether: [...mine].filter((day) => theirs.has(day)).length,
    ratitos: invites.filter(
      (invite) => invite.status === 'accepted' && localMonth(invite.starts_at ?? invite.created_at) === month,
    ).length,
    quotes: messages.filter(
      (message) => !message.locked && loved.has(message.id) && localMonth(message.created_at) === month,
    ),
  }
}
