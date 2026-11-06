import { useMe } from '@/features/auth/me'
import { useReadings } from '@/lib/data'
import type { Book, ReadingWithBook } from '@/lib/types'

export type Room = { book: Book; mine: ReadingWithBook; theirs: ReadingWithBook }

/** One room per book that both of us currently have open. */
export function useRooms(): Room[] {
  const { userId, partner } = useMe()
  const mine = useReadings(userId)
  const theirs = useReadings(partner?.id)
  const latest = (readings: ReadingWithBook[]) => {
    const byBook = new Map<string, ReadingWithBook>()
    for (const reading of readings) {
      if (reading.status !== 'reading') continue
      const previous = byBook.get(reading.book_id)
      if (!previous || reading.updated_at > previous.updated_at) byBook.set(reading.book_id, reading)
    }
    return byBook
  }
  const myBooks = latest(mine.data ?? [])
  const theirBooks = latest(partner ? (theirs.data ?? []) : [])
  const rooms: Room[] = []
  for (const [bookId, reading] of myBooks) {
    const other = theirBooks.get(bookId)
    if (other) rooms.push({ book: reading.book, mine: reading, theirs: other })
  }
  return rooms.sort((a, b) => {
    const aLatest = a.mine.updated_at > a.theirs.updated_at ? a.mine.updated_at : a.theirs.updated_at
    const bLatest = b.mine.updated_at > b.theirs.updated_at ? b.mine.updated_at : b.theirs.updated_at
    return bLatest.localeCompare(aLatest)
  })
}
