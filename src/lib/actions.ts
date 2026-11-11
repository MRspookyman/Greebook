import { fractionOf } from './lock'
import { isLit } from './model'
import { isCover } from './photo'
import { enqueue, getDb, getMe, keep, patch, save } from './sync/store'
import { isoDate, minutesBetween, nightOf } from './time'
import type { Book, Color, Reading, Session, Slip, SlipKind, Status, Unit } from './types'

/** Everything the two of you can *do*. Each is a local write; the store takes care of the server. */

const uid = () => crypto.randomUUID()
const nowIso = () => new Date().toISOString()

// ── You ──

export function updateMe(changes: { name?: string; color?: Color; welcomed_at?: string }) {
  patch('profiles', getMe(), changes)
}

// ── The candle ──

export function lightCandle(reading: Reading) {
  const me = getDb().profiles[getMe()]
  if (!me) return
  const already = isLit(me, Date.now())
  patch('profiles', me.id, {
    // Relighting for another book keeps the same flame burning.
    candle_lit_at: already ? me.candle_lit_at : nowIso(),
    candle_reading_id: reading.id,
  })
  if (reading.status !== 'leyendo') openBook(reading)
  if (!already) enqueue({ id: uid(), kind: 'notify', what: 'vela', ref: me.id })
}

/** Decides which open book the candle is for, without lighting it. */
export function chooseCandle(reading: Reading) {
  patch('profiles', getMe(), { candle_reading_id: reading.id })
}

export function snuffCandle() {
  patch('profiles', getMe(), { candle_lit_at: null })
}

/** A bookmark leaving the nightstand must not leave its candle burning. */
function snuffForReading(reading: Reading) {
  const me = getDb().profiles[getMe()]
  if (me?.candle_reading_id === reading.id && me.candle_lit_at) snuffCandle()
}

export interface Evening {
  reading: Reading
  /** Where the bookmark ends up. */
  position: number
  minutes: number | null
  place: string | null
  /** When the candle was lit, if it was. */
  startedAt: string | null
}

/** Saves a «velada» and moves the bookmark. Blows the candle out if it was burning. */
export function saveEvening({ reading, position, minutes, place, startedAt }: Evening): Session {
  const now = new Date()
  const began = startedAt ?? (minutes ? new Date(now.getTime() - minutes * 60_000).toISOString() : now.toISOString())
  const stamp = now.toISOString()
  const session: Session = {
    id: uid(),
    reading_id: reading.id,
    user_id: reading.user_id,
    day: nightOf(new Date(began)),
    started_at: began,
    minutes: minutes && minutes > 0 ? Math.min(1440, Math.round(minutes)) : null,
    from_pos: Math.min(reading.position, position),
    to_pos: position,
    place: place?.trim().slice(0, 40) || null,
    created_at: stamp,
    updated_at: stamp,
    deleted_at: null,
  }
  save('sessions', session)
  patch('readings', reading.id, {
    position,
    status: reading.status === 'pendiente' ? 'leyendo' : reading.status,
    started_on: reading.started_on ?? session.day,
  })
  if (getDb().profiles[getMe()]?.candle_lit_at) snuffCandle()
  return session
}

/** Minutes the candle has been burning, capped at what a candle lasts. */
export function burnedMinutes(litAt: string, now: number): number {
  return Math.min(180, minutesBetween(litAt, now))
}

export interface EveningFix {
  /** Where the bookmark ended up that evening. */
  position: number
  minutes: number | null
  place: string | null
}

/** Corrects a saved evening. If it was the last one, the bookmark follows the corrected page. */
export function editSession(session: Session, { position, minutes, place }: EveningFix) {
  const db = getDb()
  const reading = db.readings[session.reading_id]
  const to = Math.max(0, Math.min(reading?.total ?? position, Math.round(position)))
  const at = (s: Session) => s.started_at ?? s.created_at
  const later = Object.values(db.sessions).some(
    (s) => s.reading_id === session.reading_id && !s.deleted_at && s.id !== session.id && at(s) > at(session),
  )
  patch('sessions', session.id, {
    to_pos: to,
    from_pos: Math.min(session.from_pos, to),
    minutes: minutes && minutes > 0 ? Math.min(1440, Math.round(minutes)) : null,
    place: place?.trim().slice(0, 40) || null,
  })
  if (reading && !later && reading.status === 'leyendo' && reading.position === session.to_pos && to !== session.to_pos) {
    patch('readings', reading.id, { position: to })
  }
}

export function removeSession(session: Session) {
  patch('sessions', session.id, { deleted_at: nowIso() })
}

// ── Books ──

export interface NewBook {
  title: string
  author: string
  cover_url: string | null
  pages: number | null
  year: number | null
  isbn: string | null
}

const same = (a: string, b: string) => a.trim().toLocaleLowerCase('es') === b.trim().toLocaleLowerCase('es')

/** The book already on your shared shelf that this one is, if any. */
export function findBook(candidate: NewBook): Book | undefined {
  return Object.values(getDb().books).find(
    (book) =>
      !book.deleted_at &&
      ((candidate.isbn && book.isbn === candidate.isbn) ||
        (same(book.title, candidate.title) && same(book.author, candidate.author))),
  )
}

export function addBook(candidate: NewBook): Book {
  const existing = findBook(candidate)
  if (existing) return existing
  const stamp = nowIso()
  const book: Book = {
    id: uid(),
    title: candidate.title.trim().slice(0, 300),
    author: candidate.author.trim().slice(0, 300),
    cover_url: isCover(candidate.cover_url) ? candidate.cover_url : null,
    pages: candidate.pages,
    year: candidate.year,
    isbn: candidate.isbn,
    added_by: getMe(),
    created_at: stamp,
    updated_at: stamp,
    deleted_at: null,
  }
  save('books', book)
  return book
}

export function editBook(book: Book, changes: Partial<Pick<Book, 'title' | 'author' | 'pages' | 'cover_url'>>) {
  patch('books', book.id, changes)
}

/** What removeBook took away, so «Deshacer» can put exactly that back. */
export interface RemovedBook {
  book: Book
  readings: Reading[]
}

/** Takes a book off the shelf for both, with every bookmark of mine in it. */
export function removeBook(book: Book): RemovedBook {
  const stamp = nowIso()
  const readings = Object.values(getDb().readings).filter(
    (reading) => reading.book_id === book.id && reading.user_id === getMe() && !reading.deleted_at,
  )
  for (const reading of readings) {
    snuffForReading(reading)
    patch('readings', reading.id, { deleted_at: stamp })
  }
  patch('books', book.id, { deleted_at: stamp })
  return { book, readings }
}

export function restoreBook({ book, readings }: RemovedBook) {
  save('books', { ...(getDb().books[book.id] ?? book), deleted_at: null })
  for (const reading of readings) restoreBookmark(reading)
}

// ── Bookmarks ──

export interface Placement {
  status: Status
  unit: Unit
  total: number
  /** For a book read before Greenbook: the year it was finished. */
  finishedYear?: number
}

/** Puts my bookmark in a book (or moves the one I already have). */
export function placeBookmark(book: Book, { status, unit, total, finishedYear }: Placement): Reading {
  const me = getMe()
  const today = isoDate(new Date())
  const existing = Object.values(getDb().readings).find(
    (r) => r.user_id === me && r.book_id === book.id && !r.deleted_at,
  )
  const stamp = nowIso()
  const finished = status === 'terminado'
  const reading: Reading = {
    id: existing?.id ?? uid(),
    user_id: me,
    book_id: book.id,
    unit,
    total,
    position: finished ? total : Math.min(existing?.position ?? 0, total),
    status,
    started_on: existing?.started_on ?? (status === 'leyendo' ? today : null),
    finished_on: finished ? (finishedYear && finishedYear < Number(today.slice(0, 4)) ? `${finishedYear}-12-31` : today) : null,
    rating: existing?.rating ?? null,
    next_at: status === 'pendiente' ? (existing?.next_at ?? null) : null,
    created_at: existing?.created_at ?? stamp,
    updated_at: stamp,
    deleted_at: null,
  }
  save('readings', reading)
  return reading
}

/** Marks a pending book as the next one I'll read (or unmarks it). There is only one at a time. */
export function markNext(reading: Reading, next: boolean) {
  if (next) {
    for (const other of Object.values(getDb().readings)) {
      if (other.user_id === reading.user_id && other.id !== reading.id && other.next_at && !other.deleted_at) {
        patch('readings', other.id, { next_at: null })
      }
    }
  }
  patch('readings', reading.id, { next_at: next ? nowIso() : null })
}

/** From the pile (or back from the shelf) onto the nightstand. */
export function openBook(reading: Reading) {
  patch('readings', reading.id, {
    status: 'leyendo',
    next_at: null,
    started_on: reading.started_on ?? isoDate(new Date()),
    finished_on: null,
    position: reading.status === 'terminado' ? 0 : reading.position,
  })
}

/** Moves the bookmark without recording an evening: for corrections. */
export function moveBookmark(reading: Reading, position: number) {
  patch('readings', reading.id, { position: Math.max(0, Math.min(reading.total, position)) })
}

export function resizeReading(reading: Reading, unit: Unit, total: number) {
  const position = Math.round(fractionOf(reading.position, reading.total) * total)
  patch('readings', reading.id, { unit, total, position: Math.min(total, position) })
}

/** Closes the book: it goes to the shelf. */
export function finishReading(reading: Reading, rating: number | null) {
  snuffForReading(reading)
  patch('readings', reading.id, {
    status: 'terminado',
    position: reading.total,
    finished_on: nightOf(new Date()),
    rating,
  })
  enqueue({ id: uid(), kind: 'notify', what: 'final', ref: reading.id })
}

export function rateReading(reading: Reading, rating: number | null) {
  patch('readings', reading.id, { rating })
}

export function dropReading(reading: Reading) {
  patch('readings', reading.id, { status: 'dejado' })
  snuffForReading(reading)
}

export function shelveForLater(reading: Reading) {
  snuffForReading(reading)
  patch('readings', reading.id, { status: 'pendiente' })
}

/** Says how I have a book, from wherever: the four states lead to the same four moves. */
export function setStatus(reading: Reading, status: Status) {
  if (status === reading.status) return
  if (status === 'leyendo') openBook(reading)
  else if (status === 'terminado') finishReading(reading, reading.rating)
  else {
    if (status === 'dejado') dropReading(reading)
    else shelveForLater(reading)
    // A book that is no longer finished has no day on the shelf.
    if (reading.status === 'terminado') patch('readings', reading.id, { finished_on: null })
  }
}

/** Puts a bookmark back exactly as it was, to undo a change of state. */
export function restoreReading(before: Reading) {
  const now = getDb().readings[before.id]
  if (now) save('readings', { ...now, status: before.status, position: before.position, started_on: before.started_on, finished_on: before.finished_on, next_at: before.next_at ?? null })
}

export function removeBookmark(reading: Reading) {
  snuffForReading(reading)
  patch('readings', reading.id, { deleted_at: nowIso() })
  return reading
}

export function restoreBookmark(reading: Reading) {
  save('readings', { ...(getDb().readings[reading.id] ?? reading), deleted_at: null })
}

// ── Slips ──

export interface NewSlip {
  book: Book
  kind: SlipKind
  /** The page it belongs to in my edition; null is about the whole book. */
  page: number | null
  body: string
  /** Hidden from the other until they reach that page. */
  hidden?: boolean
}

export function leaveSlip({ book, kind, page, body, hidden = false }: NewSlip): Slip {
  const me = getMe()
  const mine = Object.values(getDb().readings).find((r) => r.user_id === me && r.book_id === book.id && !r.deleted_at)
  const total = mine?.total ?? book.pages ?? 0
  const stamp = nowIso()
  const slip: Slip = {
    id: uid(),
    user_id: me,
    book_id: book.id,
    kind,
    page,
    at: page != null && total > 0 ? fractionOf(page, total) : null,
    body: body.trim().slice(0, 4000),
    seen_at: null,
    loved: false,
    hidden: hidden && page != null && total > 0,
    created_at: stamp,
    updated_at: stamp,
    deleted_at: null,
  }
  save('slips', slip)
  enqueue({ id: uid(), kind: 'notify', what: 'papel', ref: slip.id })
  return slip
}

export function editSlip(slip: Slip, body: string, hidden: boolean = !!slip.hidden) {
  patch('slips', slip.id, { body: body.trim().slice(0, 4000), hidden: hidden && slip.at != null })
}

export function removeSlip(slip: Slip) {
  patch('slips', slip.id, { deleted_at: nowIso() })
}

/** Unfolds one of the partner's slips: they will see when you found it. */
export function openSlip(slip: Slip, loved: boolean | null = null) {
  if (slip.user_id === getMe() || slip.locked) return
  const first = !slip.seen_at
  // Shown as opened at once; the server keeps the real moment.
  keep('slips', { ...slip, seen_at: slip.seen_at ?? nowIso(), loved: loved ?? slip.loved })
  enqueue({ id: uid(), kind: 'open', slip: slip.id, loved })
  if (first) enqueue({ id: uid(), kind: 'notify', what: 'hallazgo', ref: slip.id })
}

export function restoreSession(session: Session) {
  save('sessions', { ...(getDb().sessions[session.id] ?? session), deleted_at: null })
}
