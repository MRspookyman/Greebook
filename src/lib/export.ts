import { bookViews, live } from './model'
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
 * My reading as a workbook that reads like a diary: one sheet per year, and in it each book I finished that
 * year with its stars, when I started and finished it, and what I wrote about it as a whole. Books not
 * finished yet go on a last sheet.
 */
export function exportSheets(db: Db, me: string): Sheet[] {
  const views = bookViews(db, me).filter((view) => view.mine)
  // What I wrote about each book as a whole (not about a page): the closing note, or several.
  const summary = (bookId: string) =>
    live(db.slips)
      .filter((slip) => slip.book_id === bookId && slip.user_id === me && slip.at == null && slip.body && (slip.kind === 'nota' || slip.kind === 'cita'))
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((slip) => slip.body!.trim())
      .join('\n\n')

  const byYear = new Map<string, typeof views>()
  for (const view of views) {
    if (view.mine!.status !== 'terminado') continue
    const year = view.mine!.finished_on?.slice(0, 4) ?? 'Sin fecha'
    byYear.set(year, [...(byYear.get(year) ?? []), view])
  }
  const years: Sheet[] = [...byYear.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([year, books]) => ({
      name: year,
      header: ['Título', 'Autor', 'Año del libro', 'Estrellas', 'Empezado', 'Terminado', 'Lo que me pareció'],
      rows: books
        .sort((a, b) => (a.mine!.finished_on ?? '').localeCompare(b.mine!.finished_on ?? '') || a.book.title.localeCompare(b.book.title, 'es'))
        .map(({ book, mine }) => [book.title, book.author, book.year, mine!.rating, day(mine!.started_on), day(mine!.finished_on), summary(book.id)]),
      widths: [36, 26, 13, 10, 12, 12, 80],
    }))

  const open = views
    .filter((view) => view.mine!.status !== 'terminado')
    .sort((a, b) => a.mine!.status.localeCompare(b.mine!.status) || a.book.title.localeCompare(b.book.title, 'es'))
  const pending: Sheet[] = open.length
    ? [
        {
          name: 'Sin terminar',
          header: ['Título', 'Autor', 'Año del libro', 'Estado', 'Empezado', 'Por dónde voy', 'Lo que me va pareciendo'],
          rows: open.map(({ book, mine }) => [
            book.title, book.author, book.year, STATUS[mine!.status], day(mine!.started_on), mine!.status === 'pendiente' ? null : where(mine!), summary(book.id),
          ]),
          widths: [36, 26, 13, 16, 12, 16, 80],
        },
      ]
    : []

  const sheets = [...years, ...pending]
  return sheets.length ? sheets : [{ name: 'Libros', header: ['Título', 'Autor', 'Año del libro', 'Estrellas', 'Empezado', 'Terminado', 'Lo que me pareció'], rows: [] }]
}
