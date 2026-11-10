import { fractionOf } from '../lock'
import { addDays, isoDate, nightOf } from '../time'
import type { Db, Slip } from '../types'

/**
 * An invented year and a half of reading for the rehearsal, so the shelf has something on it.
 * Everything is derived from a fixed list: the same story every time.
 */
const BOOKS: Array<[title: string, author: string, pages: number, who: 'a' | 'b' | 'ab', monthsAgo: number]> = [
  ['Nada', 'Carmen Laforet', 256, 'a', 17],
  ['Pedro Páramo', 'Juan Rulfo', 128, 'ab', 16],
  ['El camino', 'Miguel Delibes', 224, 'b', 15],
  ['Tea Rooms', 'Luisa Carnés', 256, 'a', 13],
  ['La sombra del viento', 'Carlos Ruiz Zafón', 576, 'ab', 12],
  ['Distancia de rescate', 'Samanta Schweblin', 128, 'a', 10],
  ['Los detectives salvajes', 'Roberto Bolaño', 624, 'b', 9],
  ['Canto yo y la montaña baila', 'Irene Solà', 192, 'ab', 8],
  ['El infinito en un junco', 'Irene Vallejo', 452, 'a', 6],
  ['La uruguaya', 'Pedro Mairal', 144, 'b', 5],
  ['Temporada de huracanes', 'Fernanda Melchor', 232, 'ab', 4],
  ['Panza de burro', 'Andrea Abreu', 176, 'a', 2],
  ['Patria', 'Fernando Aramburu', 648, 'b', 1],
]

const uuid = (n: number, kind: number) =>
  `${String(kind).padStart(8, '0')}-0000-4000-8000-${String(n).padStart(12, '0')}`

export function story(db: Db, a: string, b: string): Db {
  const now = new Date()
  const today = isoDate(now)
  const at = (day: string, hour = 22) => new Date(`${day}T${String(hour).padStart(2, '0')}:10:00`).toISOString()
  let n = 0
  const session = (user: string, reading: string, day: string, from: number, to: number, place: string | null) => {
    const id = uuid(++n, 3)
    db.sessions[id] = {
      id, reading_id: reading, user_id: user, day, started_at: at(day), minutes: 20 + ((n * 7) % 35),
      from_pos: from, to_pos: to, place, created_at: at(day), updated_at: at(day), deleted_at: null,
    }
  }
  const slip = (user: string, book: string, kind: Slip['kind'], page: number | null, total: number, body: string, day: string, seen = true) => {
    const id = uuid(++n, 4)
    db.slips[id] = {
      id, user_id: user, book_id: book, kind, page, at: page == null ? null : fractionOf(page, total), body,
      seen_at: seen ? at(addDays(day, 2)) : null, loved: seen && n % 2 === 0,
      created_at: at(day), updated_at: at(day), deleted_at: null,
    }
  }
  const places = ['en la cama', 'en el sofá', 'en el tren', null]

  BOOKS.forEach(([title, author, pages, who, monthsAgo], i) => {
    const book = uuid(i + 1, 1)
    const end = addDays(today, -monthsAgo * 30)
    db.books[book] = {
      id: book, title, author, cover_url: null, pages, year: null, isbn: null, added_by: who === 'b' ? b : a,
      created_at: at(addDays(end, -20)), updated_at: at(end), deleted_at: null,
    }
    for (const [user, tag] of [[a, 'a'], [b, 'b']] as const) {
      if (!who.includes(tag)) continue
      const reading = uuid(i + 1 + (tag === 'b' ? 100 : 0), 2)
      const finished = addDays(end, tag === 'b' ? 3 : 0)
      db.readings[reading] = {
        id: reading, user_id: user, book_id: book, unit: 'paginas', total: pages, position: pages,
        status: 'terminado', started_on: addDays(finished, -14), finished_on: finished, rating: 3 + ((i + tag.length) % 3),
        created_at: at(addDays(finished, -14)), updated_at: at(finished), deleted_at: null,
      }
      const nights = 5
      for (let k = 0; k < nights; k++) {
        session(user, reading, addDays(finished, -(nights - 1 - k) * 3), Math.round((pages * k) / nights),
          Math.round((pages * (k + 1)) / nights), places[(i + k) % places.length])
      }
    }
    if (who === 'ab') {
      slip(a, book, 'cita', Math.round(pages * 0.4), pages, 'Esta frase es para ti. La subrayé dos veces.', addDays(end, -8))
      slip(b, book, 'nota', Math.round(pages * 0.7), pages, 'Aquí tuve que parar un rato. Ya me dirás.', addDays(end, -5))
      slip(a, book, 'carta', null, pages, 'Me alegro de haberlo leído contigo. Me quedo con el final.', end)
      slip(b, book, 'carta', null, pages, 'No era lo que esperaba y por eso me ha gustado tanto.', addDays(end, 3))
    }
  })

  // Tonight: one book you both have open, with something waiting further on.
  const shared = uuid(50, 1)
  db.books[shared] = {
    id: shared, title: 'Rayuela', author: 'Julio Cortázar', cover_url: null, pages: 600, year: 1963, isbn: null,
    added_by: a, created_at: at(addDays(today, -12)), updated_at: at(addDays(today, -12)), deleted_at: null,
  }
  for (const [user, tag, position] of [[a, 'a', 142], [b, 'b', 210]] as const) {
    const reading = uuid(tag === 'a' ? 50 : 150, 2)
    db.readings[reading] = {
      id: reading, user_id: user, book_id: shared, unit: 'paginas', total: 600, position, status: 'leyendo',
      started_on: addDays(today, -12), finished_on: null, rating: null,
      created_at: at(addDays(today, -12)), updated_at: at(addDays(today, -1)), deleted_at: null,
    }
    for (let k = 0; k < 4; k++) {
      session(user, reading, addDays(nightOf(now), -(4 - k) * 2), Math.round((position * k) / 4),
        Math.round((position * (k + 1)) / 4), places[k % places.length])
    }
  }
  slip(b, shared, 'nota', 150, 600, 'Cuando llegues aquí, mírame. Sé la cara que vas a poner.', addDays(today, -3), false)
  slip(b, shared, 'cita', 198, 600, '«Andábamos sin buscarnos pero sabiendo que andábamos para encontrarnos.»', addDays(today, -2), false)
  slip(a, shared, 'cita', 93, 600, '«Toco tu boca, con un dedo toco el borde de tu boca.»', addDays(today, -6))

  const mine = uuid(51, 1)
  db.books[mine] = {
    id: mine, title: 'La ciudad y los perros', author: 'Mario Vargas Llosa', cover_url: null, pages: 480, year: 1963,
    isbn: null, added_by: b, created_at: at(addDays(today, -30)), updated_at: at(addDays(today, -30)), deleted_at: null,
  }
  db.readings[uuid(151, 2)] = {
    id: uuid(151, 2), user_id: b, book_id: mine, unit: 'paginas', total: 480, position: 0, status: 'pendiente',
    started_on: null, finished_on: null, rating: null,
    created_at: at(addDays(today, -30)), updated_at: at(addDays(today, -30)), deleted_at: null,
  }
  for (const id of [a, b]) db.profiles[id] = { ...db.profiles[id], welcomed_at: at(addDays(today, -400)) }
  return db
}
