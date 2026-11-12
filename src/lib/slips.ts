import { isLocked, positionFor } from './lock'
import type { Book, Db, Reading, Slip } from './types'

/**
 * What is written in a book now: notes. The letters and predictions of the first versions are no longer
 * shown anywhere (they stay in the database, untouched).
 */
const liveSlips = (db: Db) => Object.values(db.slips).filter((slip) => !slip.deleted_at && (slip.kind === 'nota' || slip.kind === 'cita'))

/** Where a slip sits, said in the reader's own terms: «p. 150», «36 %». Empty when it has no page. */
export function slipPlace(slip: Pick<Slip, 'at' | 'page'>, reader: Pick<Reading, 'unit' | 'total'> | undefined): string {
  if (slip.at == null) return ''
  if (!reader) return slip.page != null ? `p. ${slip.page}` : ''
  const position = positionFor(slip.at, reader.total)
  return reader.unit === 'porcentaje' ? `${position} %` : `p. ${position}`
}

/** The notes between the pages of a book, in reading order. Each belongs to a page. */
export function papersOf(db: Db, bookId: string): Slip[] {
  return liveSlips(db)
    .filter((slip) => slip.book_id === bookId && slip.at != null)
    .sort((a, b) => a.at! - b.at! || a.created_at.localeCompare(b.created_at))
}

/**
 * The reviews of a book: what each of you wrote about it as a whole. They are notes without a page, kept
 * apart from the ones between pages, and always open to both.
 */
export function reviewsOf(db: Db, bookId: string): Slip[] {
  return liveSlips(db)
    .filter((slip) => slip.book_id === bookId && slip.at == null)
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
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
    // Only notes between pages are handed over; a review is simply there, in its own place.
    if (slip.user_id === me || !book || book.deleted_at || slip.seen_at || slip.at == null) continue
    if (!slip.locked && slip.body != null) out.push({ kind: 'papel', book, slip, opening: false })
    // Hidden as far as this phone knows, but by my own bookmark I can read it: it opens at the next sync.
    else if (!isLocked(slip, me, markOf(db, me, slip.book_id))) out.push({ kind: 'papel', book, slip, opening: true })
  }
  return out
}

/** A book and the notes between its pages, as the mailbox shows it. */
export interface Bundle {
  book: Book
  /** In reading order. */
  slips: Slip[]
  /** Theirs, readable now and not opened yet. */
  unread: number
  /** Theirs, still hidden further on. */
  ahead: number
  /** When the newest of them was written. */
  latest: string
}

/**
 * «Las notas»: every note between pages that the two of you have left, book by book. Books with something to
 * read come first; after that, wherever something was written last.
 */
export function mailbox(db: Db, me: string): Bundle[] {
  const bundles = new Map<string, Bundle>()
  for (const slip of liveSlips(db)) {
    const book = db.books[slip.book_id]
    if (slip.at == null || !book || book.deleted_at) continue
    let bundle = bundles.get(book.id)
    if (!bundle) bundles.set(book.id, (bundle = { book, slips: [], unread: 0, ahead: 0, latest: '' }))
    bundle.slips.push(slip)
    if (slip.created_at > bundle.latest) bundle.latest = slip.created_at
    if (slip.user_id === me) continue
    if (slip.locked || slip.body == null) bundle.ahead++
    else if (!slip.seen_at) bundle.unread++
  }
  for (const bundle of bundles.values()) bundle.slips.sort((a, b) => a.at! - b.at! || a.created_at.localeCompare(b.created_at))
  return [...bundles.values()].sort((a, b) => Number(b.unread > 0) - Number(a.unread > 0) || b.latest.localeCompare(a.latest))
}
