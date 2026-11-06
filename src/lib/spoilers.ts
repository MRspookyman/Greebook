import type { Book, Note, Reading } from './types'

/**
 * A partner's note is a spoiler when its page lies ahead of where I am.
 * Audio readings compare progress fractions through the book's page count; without
 * a page count, any positioned note stays hidden until I finish.
 */
export function isSpoiler(
  note: Pick<Note, 'page'>,
  myReading: Pick<Reading, 'unit' | 'current_position' | 'total_units' | 'status'>,
  book: Pick<Book, 'page_count'>,
): boolean {
  if (note.page == null) return false
  if (myReading.status === 'finished') return false
  if (myReading.unit === 'pages') return note.page > myReading.current_position
  if (book.page_count) return note.page / book.page_count > myReading.current_position / myReading.total_units
  return true
}
