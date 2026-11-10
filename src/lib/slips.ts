import { fractionOf, positionFor } from './lock'
import type { Book, Db, Reading, Slip } from './types'

/** Slips between pages, as opposed to the two kinds that live in the envelope. */
export const isPaper = (slip: Slip) => slip.kind === 'cita' || slip.kind === 'nota'

const liveSlips = (db: Db) => Object.values(db.slips).filter((slip) => !slip.deleted_at)

const markOf = (db: Db, user: string, book: string): Reading | undefined =>
  Object.values(db.readings)
    .filter((r) => r.user_id === user && r.book_id === book && !r.deleted_at)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0]

/** Where a slip sits, said in the reader's own terms: «p. 150», «36 %». Empty when it has no page. */
export function slipPlace(slip: Pick<Slip, 'at' | 'page'>, reader: Pick<Reading, 'unit' | 'total'> | undefined): string {
  if (slip.at == null) return ''
  if (!reader) return slip.page != null ? `p. ${slip.page}` : ''
  const position = positionFor(slip.at, reader.total)
  return reader.unit === 'porcentaje' ? `${position} %` : `p. ${position}`
}

/** The slips of a book in reading order; those without a page come first, then by when they were written. */
export function papersOf(db: Db, bookId: string): Slip[] {
  return liveSlips(db)
    .filter((slip) => slip.book_id === bookId && isPaper(slip))
    .sort((a, b) => (a.at ?? -1) - (b.at ?? -1) || a.created_at.localeCompare(b.created_at))
}

export interface Envelope {
  mine: { prediccion?: Slip; carta?: Slip }
  theirs: { prediccion?: Slip; carta?: Slip }
  /** Something of theirs is inside and I can't read it yet. */
  sealed: boolean
  /** Theirs that I can read and haven't opened. */
  toOpen: Slip[]
  empty: boolean
}

/** My final note in a book (kind «carta»): what it was for me, kept with it. */
export function finalNote(db: Db, bookId: string, me: string): Slip | undefined {
  return Object.values(db.slips).find((s) => s.book_id === bookId && s.user_id === me && s.kind === 'carta' && !s.deleted_at)
}

/** What a book keeps at its end: a final note from each of you (and, from before, maybe a prediction). */
export function envelopeOf(db: Db, bookId: string, me: string): Envelope {
  const inside = liveSlips(db)
    .filter((slip) => slip.book_id === bookId && !isPaper(slip))
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
  const pick = (mine: boolean, kind: Slip['kind']) => inside.findLast((s) => (s.user_id === me) === mine && s.kind === kind)
  const theirs = { prediccion: pick(false, 'prediccion'), carta: pick(false, 'carta') }
  const theirList = [theirs.prediccion, theirs.carta].filter((s): s is Slip => !!s)
  return {
    mine: { prediccion: pick(true, 'prediccion'), carta: pick(true, 'carta') },
    theirs,
    sealed: theirList.some((s) => s.locked),
    toOpen: theirList.filter((s) => !s.locked && s.body != null && !s.seen_at),
    empty: !inside.length,
  }
}

/** Something that is waiting for me in the room. */
export type Waiting =
  /** One of their slips that I have reached: it falls out of the book. `opening` until the server sends its text. */
  | { kind: 'papel'; book: Book; slip: Slip; opening: boolean }
  /** An envelope with something of theirs I can now read. */
  | { kind: 'sobre'; book: Book; count: number }
  /** Their letter is inside; it opens when I write mine. */
  | { kind: 'carta'; book: Book }

/** Everything of theirs that I can open now, newest first. This is what the room hands back to you. */
export function waitingFor(db: Db, me: string): Waiting[] {
  const out: Waiting[] = []
  const books = new Set<string>()
  for (const slip of liveSlips(db).sort((a, b) => b.created_at.localeCompare(a.created_at))) {
    const book = db.books[slip.book_id]
    if (slip.user_id === me || !book || book.deleted_at) continue
    if (isPaper(slip)) {
      if (slip.seen_at) continue
      if (!slip.locked && slip.body != null) out.push({ kind: 'papel', book, slip, opening: false })
      else {
        // Folded as far as this phone knows, but my bookmark is already past it: it opens at the next sync.
        const mine = markOf(db, me, slip.book_id)
        if (mine && slip.at != null && fractionOf(mine.position, mine.total) >= slip.at) {
          out.push({ kind: 'papel', book, slip, opening: true })
        }
      }
    } else books.add(slip.book_id)
  }
  for (const bookId of books) {
    const book = db.books[bookId]
    const envelope = envelopeOf(db, bookId, me)
    if (envelope.toOpen.length) out.push({ kind: 'sobre', book, count: envelope.toOpen.length })
    else if (envelope.theirs.carta?.locked && !envelope.mine.carta && markOf(db, me, bookId)?.status === 'terminado') {
      out.push({ kind: 'carta', book })
    }
  }
  return out
}
