import type { Book, Db, Profile, Reading, Session, Slip } from './types'
import { fractionOf } from './lock'

/** A candle burns for three hours; after that one left lit no longer counts as presence. */
export const CANDLE_MS = 3 * 60 * 60 * 1000

export function live<T extends { deleted_at?: string | null }>(rows: Record<string, T>): T[] {
  return Object.values(rows).filter((row) => !row.deleted_at)
}

/** Whether this person's candle is burning right now. A few minutes of clock difference are tolerated. */
export function isLit(person: Pick<Profile, 'candle_lit_at'> | null | undefined, now: number): boolean {
  if (!person?.candle_lit_at) return false
  const elapsed = now - new Date(person.candle_lit_at).getTime()
  return elapsed > -5 * 60_000 && elapsed < CANDLE_MS
}

/** How much of the candle is left, 1 → 0 over its three hours. */
export function waxLeft(litAt: string | null | undefined, now: number): number {
  if (!litAt) return 1
  return Math.min(1, Math.max(0, 1 - (now - new Date(litAt).getTime()) / CANDLE_MS))
}

/** A book as the two of you see it: one object, up to two bookmarks. */
export interface BookView {
  book: Book
  mine?: Reading
  theirs?: Reading
}

function latest(a: Reading | undefined, b: Reading): Reading {
  return !a || b.updated_at > a.updated_at ? b : a
}

export function bookViews(db: Db, me: string): BookView[] {
  const views = new Map<string, BookView>()
  for (const book of live(db.books)) views.set(book.id, { book })
  for (const reading of live(db.readings)) {
    const view = views.get(reading.book_id)
    if (!view) continue
    if (reading.user_id === me) view.mine = latest(view.mine, reading)
    else view.theirs = latest(view.theirs, reading)
  }
  return [...views.values()]
}

/** When each reading was last read, to order the nightstand. */
function lastRead(sessions: Session[]): Map<string, string> {
  const last = new Map<string, string>()
  for (const s of sessions) {
    const at = s.started_at ?? s.created_at
    if ((last.get(s.reading_id) ?? '') < at) last.set(s.reading_id, at)
  }
  return last
}

/** Books open right now by either of you; yours first, most recently read first. */
export function nightstand(views: BookView[], sessions: Session[]): BookView[] {
  const last = lastRead(sessions)
  const stamp = (r?: Reading) => (r?.status === 'leyendo' ? (last.get(r.id) ?? r.updated_at) : '')
  return views
    .filter((v) => v.mine?.status === 'leyendo' || v.theirs?.status === 'leyendo')
    .sort((a, b) => {
      const mine = Number(b.mine?.status === 'leyendo') - Number(a.mine?.status === 'leyendo')
      if (mine) return mine
      return (stamp(b.mine) || stamp(b.theirs)).localeCompare(stamp(a.mine) || stamp(a.theirs))
    })
}

/** The nightstand sorted by whose book it is: open for both, only for me, only for the other. */
export interface Stand {
  both: BookView[]
  mine: BookView[]
  theirs: BookView[]
}

export function standGroups(stand: BookView[]): Stand {
  const open = (r?: Reading) => r?.status === 'leyendo'
  return {
    both: stand.filter((v) => open(v.mine) && open(v.theirs)),
    mine: stand.filter((v) => open(v.mine) && !open(v.theirs)),
    theirs: stand.filter((v) => !open(v.mine) && open(v.theirs)),
  }
}

/** Whose books the shelf shows: everything, what both have, what I have, what the other has. */
export type Whose = 'todos' | 'dos' | 'yo' | 'tu'

/** Whether a book counts for that filter, looking only at bookmarks in the given status. */
export function heldBy(view: BookView, whose: Whose, status: Reading['status']): boolean {
  const mine = view.mine?.status === status
  const theirs = view.theirs?.status === status
  if (whose === 'dos') return mine && theirs
  if (whose === 'yo') return mine
  if (whose === 'tu') return theirs
  return mine || theirs
}

/** Waiting to be read by someone, and open for no one. */
/** Whether this bookmark is its owner's «siguiente»: the book of the pile they mean to read next. */
export const isNext = (reading?: Reading) => reading?.status === 'pendiente' && !!reading.next_at

export function pile(views: BookView[]): BookView[] {
  // Whoever's «siguiente» it is, it stands first on the plank; mine before theirs.
  const rank = (v: BookView) => Number(isNext(v.mine)) * 2 + Number(isNext(v.theirs))
  return views
    .filter((v) => (v.mine?.status === 'pendiente' || v.theirs?.status === 'pendiente') &&
      v.mine?.status !== 'leyendo' && v.theirs?.status !== 'leyendo')
    .sort((a, b) =>
      rank(b) - rank(a) || a.book.created_at.localeCompare(b.book.created_at))
}

/** The day a book joined the shelf: the first time one of you finished it. */
export function shelvedOn(view: BookView): string | null {
  const days = [view.mine, view.theirs]
    .filter((r): r is Reading => r?.status === 'terminado' && !!r.finished_on)
    .map((r) => r.finished_on!)
    .sort()
  return days[0] ?? null
}

export interface YearShelf {
  year: number
  books: BookView[]
}

/** Finished books by the year they joined the shelf, newest year first; each year fills left to right. */
export function shelves(views: BookView[]): YearShelf[] {
  const byYear = new Map<number, BookView[]>()
  for (const view of views) {
    const day = shelvedOn(view)
    if (!day) continue
    const year = Number(day.slice(0, 4))
    byYear.set(year, [...(byYear.get(year) ?? []), view])
  }
  return [...byYear.entries()]
    .sort(([a], [b]) => b - a)
    .map(([year, books]) => ({
      year,
      books: books.sort((a, b) => shelvedOn(a)!.localeCompare(shelvedOn(b)!)),
    }))
}

/** Books neither of you is reading, has pending or finished: left halfway. */
export function dropped(views: BookView[]): BookView[] {
  const active = (r?: Reading) => !!r && r.status !== 'dejado'
  return views.filter((v) => (v.mine || v.theirs) && !active(v.mine) && !active(v.theirs))
}

/** The reading the candle would be lit for: the one you were reading last. */
export function candleReading(db: Db, me: string, views: BookView[], sessions: Session[]): BookView | undefined {
  const lit = db.profiles[me]?.candle_reading_id
  const open = nightstand(views, sessions).filter((v) => v.mine?.status === 'leyendo')
  return open.find((v) => v.mine!.id === lit) ?? open[0]
}

/** «p. 142», «36 %». */
export function fmtPosition(reading: Pick<Reading, 'unit' | 'position'>): string {
  return reading.unit === 'porcentaje' ? `${reading.position} %` : `p. ${reading.position}`
}

/** «página 142 de 384», «36 % del libro». */
export function fmtProgress(reading: Pick<Reading, 'unit' | 'position' | 'total'>): string {
  return reading.unit === 'porcentaje'
    ? `${reading.position} % del libro`
    : `página ${reading.position} de ${reading.total}`
}

export const progressOf = (reading: Pick<Reading, 'position' | 'total'>) => fractionOf(reading.position, reading.total)

/** Sessions newest first. */
export function byNewest(sessions: Session[]): Session[] {
  const at = (s: Session) => s.started_at ?? s.created_at
  return [...sessions].sort((a, b) => at(b).localeCompare(at(a)))
}

/** What a set of sessions adds up to. */
export function tally(sessions: Session[]): { nights: number; minutes: number; place: string | null } {
  const nights = new Set(sessions.map((s) => s.day)).size
  const minutes = sessions.reduce((sum, s) => sum + (s.minutes ?? 0), 0)
  const places = new Map<string, number>()
  for (const s of sessions) if (s.place) places.set(s.place, (places.get(s.place) ?? 0) + 1)
  const place = [...places.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
  return { nights, minutes, place }
}

/** The places you have read in, most used first. */
export function knownPlaces(sessions: Session[], userId: string): string[] {
  const counts = new Map<string, number>()
  for (const s of sessions) if (s.user_id === userId && s.place) counts.set(s.place, (counts.get(s.place) ?? 0) + 1)
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([place]) => place)
}

/** The partner's slips in a book that I can read but haven't opened yet. */
export function unopened(slips: Slip[], me: string): Slip[] {
  return slips.filter((s) => s.user_id !== me && !s.deleted_at && !s.locked && s.body != null && !s.seen_at)
}

/** How the finished shelf is ordered: by the year they were read (the default), or all together by something. */
export type ShelfOrder = 'fecha' | 'titulo' | 'autor' | 'puntuacion'

/** The stars a book shows for that filter: theirs when looking at their books, otherwise mine, or theirs if I gave none. */
export function ratingOf(view: BookView, whose: Whose = 'todos'): number | null {
  if (whose === 'tu') return view.theirs?.rating ?? null
  if (whose === 'yo') return view.mine?.rating ?? null
  return view.mine?.rating ?? view.theirs?.rating ?? null
}

const plain = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').trim()

/** Whether a book's title or author contains what was typed, ignoring accents and capitals. */
export function matchesText(view: BookView, text: string): boolean {
  const wanted = plain(text)
  return !wanted || plain(`${view.book.title} ${view.book.author}`).includes(wanted)
}

/** Finished books all together, in the order asked for. Unrated books go last when ordering by stars. */
export function sortViews(views: BookView[], order: ShelfOrder, whose: Whose = 'todos'): BookView[] {
  const title = (a: BookView, b: BookView) => a.book.title.localeCompare(b.book.title, 'es', { sensitivity: 'base' })
  const sorted = [...views]
  if (order === 'titulo') return sorted.sort(title)
  if (order === 'autor') {
    return sorted.sort((a, b) => (a.book.author || '\uffff').localeCompare(b.book.author || '\uffff', 'es', { sensitivity: 'base' }) || title(a, b))
  }
  if (order === 'puntuacion') return sorted.sort((a, b) => (ratingOf(b, whose) ?? 0) - (ratingOf(a, whose) ?? 0) || title(a, b))
  return sorted.sort((a, b) => (shelvedOn(b) ?? '').localeCompare(shelvedOn(a) ?? ''))
}
