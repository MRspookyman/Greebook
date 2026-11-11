import { bookViews, live } from './model'
import { slipPlace } from './slips'
import type { Db, Reading, Status } from './types'
import type { Sheet } from './xlsx'

const STATUS: Record<Status, string> = {
  leyendo: 'Leyendo',
  pendiente: 'Por leer',
  terminado: 'Terminado',
  dejado: 'Dejado a medias',
}

const where = (reading: Reading) => (reading.unit === 'porcentaje' ? `${reading.position} %` : `p. ${reading.position} de ${reading.total}`)
const day = (iso?: string | null) => (iso ? { day: iso } : null)

/**
 * Everything on this phone as the sheets of a workbook: the books with where each of you is, the evenings and
 * the notes. A note of theirs that is still hidden from me has no text here either.
 */
export function exportSheets(db: Db, me: string): Sheet[] {
  const names = (id: string) => (id === me ? 'Tú' : (db.profiles[id]?.name ?? 'Tu pareja'))
  const partner = db.profiles[me]?.partner_id ?? null
  const other = partner ? names(partner) : null
  const views = bookViews(db, me).sort((a, b) => a.book.title.localeCompare(b.book.title, 'es', { sensitivity: 'base' }))

  const mark = (reading?: Reading) => [
    reading ? STATUS[reading.status] : null,
    reading ? where(reading) : null,
    day(reading?.started_on),
    day(reading?.status === 'terminado' ? reading.finished_on : null),
    reading?.rating ?? null,
  ]
  const markHeader = (who: string) => [`${who}: estado`, `${who}: por dónde`, `${who}: empezado`, `${who}: terminado`, `${who}: estrellas`]

  const books: Sheet = {
    name: 'Libros',
    header: ['Título', 'Autor', 'Páginas', 'Año', 'ISBN', 'Lo añadió', ...markHeader('Tú'), ...(other ? markHeader(other) : [])],
    rows: views.map(({ book, mine, theirs }) => [
      book.title, book.author, book.pages, book.year, book.isbn, names(book.added_by), ...mark(mine), ...(other ? mark(theirs) : []),
    ]),
    widths: [34, 24, 9, 7, 16, 12, 16, 16, 12, 12, 10, 16, 16, 12, 12, 10],
  }

  const sessions = live(db.sessions)
    .map((session) => ({ session, reading: db.readings[session.reading_id] }))
    .filter(({ reading }) => reading && !reading.deleted_at && db.books[reading.book_id] && !db.books[reading.book_id].deleted_at)
    .sort((a, b) => b.session.day.localeCompare(a.session.day) || (b.session.started_at ?? '').localeCompare(a.session.started_at ?? ''))
  const evenings: Sheet = {
    name: 'Veladas',
    header: ['Noche', 'Quién', 'Libro', 'Desde', 'Hasta', 'Leído', 'Minutos', 'Dónde'],
    rows: sessions.map(({ session, reading }) => [
      day(session.day),
      names(session.user_id),
      db.books[reading.book_id].title,
      session.from_pos,
      session.to_pos,
      `${Math.max(0, session.to_pos - session.from_pos)} ${reading.unit === 'porcentaje' ? '%' : 'páginas'}`,
      session.minutes,
      session.place,
    ]),
    widths: [12, 12, 34, 8, 8, 14, 9, 18],
  }

  const slips = live(db.slips)
    .filter((slip) => db.books[slip.book_id] && !db.books[slip.book_id].deleted_at)
    .sort(
      (a, b) =>
        db.books[a.book_id].title.localeCompare(db.books[b.book_id].title, 'es', { sensitivity: 'base' }) ||
        (a.at ?? -1) - (b.at ?? -1) ||
        a.created_at.localeCompare(b.created_at),
    )
  const notes: Sheet = {
    name: 'Notas',
    header: ['Libro', 'Quién', 'Página', 'Nota', 'Cómo se ve', 'Escrita', 'Leída por el otro', 'Le llegó'],
    rows: slips.map((slip) => {
      const author = slip.user_id === me ? views.find((v) => v.book.id === slip.book_id)?.mine : views.find((v) => v.book.id === slip.book_id)?.theirs
      return [
        db.books[slip.book_id].title,
        names(slip.user_id),
        slip.at == null ? 'El libro entero' : slip.page != null ? `p. ${slip.page}` : slipPlace(slip, author),
        slip.body ?? '(oculta hasta que llegues a su página)',
        slip.hidden && slip.at != null ? 'Oculta hasta llegar' : 'A la vista',
        day(slip.created_at),
        day(slip.seen_at),
        slip.loved ? 'Sí' : null,
      ]
    }),
    widths: [34, 12, 16, 70, 18, 12, 16, 9],
  }

  return [books, evenings, notes]
}
