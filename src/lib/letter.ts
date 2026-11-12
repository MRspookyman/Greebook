import { bookViews, live, shelves, tally, type BookView } from './model'
import { nightsOf, sharedNights } from './nights'
import type { Db, Slip } from './types'

/**
 * «La carta del año»: what a year of reading left behind, told to the two of you and to nobody else.
 * Everything in it is a sum of both: it never says who read more.
 */
export interface Letter {
  year: number
  /** Finished that year by either of you, in the order they reached the shelf. */
  books: BookView[]
  /** Of those, the ones both of you have finished. */
  together: BookView[]
  /** Given five stars by either. */
  favourites: BookView[]
  /** Nights on which a candle burned. */
  nights: number
  /** Nights on which both did. */
  shared: number
  minutes: number
  /** Where you read most, if you said. */
  place: string | null
  /** The month (0–11) with most nights, once there are enough to tell. */
  month: number | null
  /** Notes left between pages that year. */
  notes: number
  /** The ones that got a heart, oldest first: only what I can read. */
  loved: Slip[]
}

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
export const monthName = (month: number) => MONTHS[month]

/** The letter for a year, or null when nothing happened in it. */
export function letterFor(db: Db, me: string, year: number): Letter | null {
  const prefix = `${year}-`
  const partner = db.profiles[me]?.partner_id ?? ''
  const books = shelves(bookViews(db, me)).find((shelf) => shelf.year === year)?.books ?? []
  const sessions = live(db.sessions).filter((session) => session.day.startsWith(prefix))
  const slips = live(db.slips).filter(
    (slip) => (slip.kind === 'nota' || slip.kind === 'cita') && slip.at != null && slip.created_at.startsWith(prefix) && !db.books[slip.book_id]?.deleted_at,
  )
  if (!books.length && !sessions.length && !slips.length) return null

  const { nights, minutes, place } = tally(sessions)
  const shared = sharedNights(nightsOf(sessions, me), nightsOf(sessions, partner))
  // The month is counted in nights you met when there are any; alone, in nights you read.
  const days = shared.length ? shared : [...new Set(sessions.map((session) => session.day))]
  const perMonth = new Array<number>(12).fill(0)
  for (const day of days) perMonth[Number(day.slice(5, 7)) - 1]++
  const most = Math.max(...perMonth)

  return {
    year,
    books,
    together: books.filter((view) => view.mine?.status === 'terminado' && view.theirs?.status === 'terminado'),
    favourites: books.filter((view) => view.mine?.rating === 5 || view.theirs?.rating === 5),
    nights,
    shared: shared.length,
    minutes,
    place,
    // One month standing out needs a few nights and no tie.
    month: most >= 3 && perMonth.filter((count) => count === most).length === 1 ? perMonth.indexOf(most) : null,
    notes: slips.length,
    loved: slips.filter((slip) => slip.loved && slip.body != null && !slip.locked).sort((a, b) => a.created_at.localeCompare(b.created_at)),
  }
}

/** The years that have a letter, newest first. */
export function letterYears(db: Db, me: string): number[] {
  const years = new Set<number>()
  for (const shelf of shelves(bookViews(db, me))) years.add(shelf.year)
  for (const session of live(db.sessions)) years.add(Number(session.day.slice(0, 4)))
  return [...years].sort((a, b) => b - a)
}
