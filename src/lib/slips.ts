import { isLocked, positionFor } from './lock'
import type { Book, Db, Reading, Slip } from './types'

const liveSlips = (db: Db) => Object.values(db.slips).filter((slip) => !slip.deleted_at)

/** Where a slip sits, said in the reader's own terms: «p. 150», «36 %». Empty when it has no page. */
export function slipPlace(slip: Pick<Slip, 'at' | 'page'>, reader: Pick<Reading, 'unit' | 'total'> | undefined): string {
  if (slip.at == null) return ''
  if (!reader) return slip.page != null ? `p. ${slip.page}` : ''
  const position = positionFor(slip.at, reader.total)
  return reader.unit === 'porcentaje' ? `${position} %` : `p. ${position}`
}

/**
 * The notes of a book in reading order; those about the whole book (no page) come first, then by when they
 * were written. Every kind is a note now, the old letters and predictions included.
 */
export function papersOf(db: Db, bookId: string): Slip[] {
  return liveSlips(db)
    .filter((slip) => slip.book_id === bookId)
    .sort((a, b) => (a.at ?? -1) - (b.at ?? -1) || a.created_at.localeCompare(b.created_at))
}

/** A note of theirs I can read and haven't opened. `opening` while this phone still waits for its text. */
export interface Waiting {
  kind: 'papel'
  book: Book
  slip: Slip
  opening: boolean
}

const markOf = (db: Db, user: string, book: string): Reading | undefined =>
  Object.values(db.readings)
    .filter((r) => r.user_id === user && r.book_id === book && !r.deleted_at)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0]

/** Every note of theirs I can open now, newest first. This is what the room hands back to you. */
export function waitingFor(db: Db, me: string): Waiting[] {
  const out: Waiting[] = []
  for (const slip of liveSlips(db).sort((a, b) => b.created_at.localeCompare(a.created_at))) {
    const book = db.books[slip.book_id]
    if (slip.user_id === me || !book || book.deleted_at || slip.seen_at) continue
    if (!slip.locked && slip.body != null) out.push({ kind: 'papel', book, slip, opening: false })
    // Hidden as far as this phone knows, but by my own bookmark I can read it: it opens at the next sync.
    else if (!isLocked(slip, me, markOf(db, me, slip.book_id))) out.push({ kind: 'papel', book, slip, opening: true })
  }
  return out
}
