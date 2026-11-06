import type { Book, Note, Reading } from './types'

export function isSpoiler(
  note: Pick<Note, 'page'>,
  myReading: Pick<Reading, 'unit' | 'current_position' | 'status'>,
  book: Pick<Book, 'page_count'>,
): boolean {
  if (note.page == null) return false
  if (myReading.unit === 'pages') return note.page > myReading.current_position
  if (myReading.unit === 'percent' && book.page_count) {
    return (note.page / book.page_count) * 100 > myReading.current_position
  }
  return myReading.status !== 'finished'
}
