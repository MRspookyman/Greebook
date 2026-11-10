import { describe, expect, it } from 'vitest'
import { bookViews, candleReading, dropped, isLit, nightstand, pile, shelves, tally, waxLeft } from './model'
import { emptyDb, type Book, type Db, type Reading, type Session } from './types'

const book = (id: string, extra: Partial<Book> = {}): Book => ({
  id, title: id, author: '', cover_url: null, pages: 300, year: null, isbn: null, added_by: 'me',
  created_at: `2026-01-01T00:00:0${id.length}Z`, updated_at: '2026-01-01T00:00:00Z', deleted_at: null, ...extra,
})
const reading = (id: string, user_id: string, book_id: string, extra: Partial<Reading> = {}): Reading => ({
  id, user_id, book_id, unit: 'paginas', total: 300, position: 0, status: 'leyendo', started_on: null,
  finished_on: null, rating: null, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
  deleted_at: null, ...extra,
})
const session = (reading_id: string, started_at: string, extra: Partial<Session> = {}): Session => ({
  id: reading_id + started_at, reading_id, user_id: 'me', day: started_at.slice(0, 10), started_at, minutes: 30,
  from_pos: 0, to_pos: 10, place: null, created_at: started_at, updated_at: started_at, deleted_at: null, ...extra,
})
const db = (books: Book[], readings: Reading[]): Db => ({
  ...emptyDb(),
  books: Object.fromEntries(books.map((b) => [b.id, b])),
  readings: Object.fromEntries(readings.map((r) => [r.id, r])),
})

describe('la habitación', () => {
  it('un libro es un solo objeto con los dos marcapáginas', () => {
    const views = bookViews(db([book('a')], [reading('1', 'me', 'a'), reading('2', 'you', 'a')]), 'me')
    expect(views).toHaveLength(1)
    expect(views[0].mine?.id).toBe('1')
    expect(views[0].theirs?.id).toBe('2')
  })

  it('ignora libros y marcapáginas borrados', () => {
    const views = bookViews(
      db([book('a'), book('bb', { deleted_at: 'x' })], [reading('1', 'me', 'a', { deleted_at: 'x' })]),
      'me',
    )
    expect(views).toHaveLength(1)
    expect(views[0].mine).toBeUndefined()
  })

  it('en la mesilla van primero los míos y, de esos, el que leí el último', () => {
    const data = db(
      [book('a'), book('bb'), book('ccc')],
      [reading('1', 'me', 'a'), reading('2', 'me', 'bb'), reading('3', 'you', 'ccc')],
    )
    const sessions = [session('1', '2026-11-01T22:00:00Z'), session('2', '2026-11-09T22:00:00Z')]
    expect(nightstand(bookViews(data, 'me'), sessions).map((v) => v.book.id)).toEqual(['bb', 'a', 'ccc'])
  })

  it('la vela se enciende para el libro que estaba leyendo, o para el último', () => {
    const data = db([book('a'), book('bb')], [reading('1', 'me', 'a'), reading('2', 'me', 'bb')])
    const sessions = [session('2', '2026-11-09T22:00:00Z')]
    const views = bookViews(data, 'me')
    expect(candleReading(data, 'me', views, sessions)?.book.id).toBe('bb')
    data.profiles.me = { candle_reading_id: '1' } as Db['profiles'][string]
    expect(candleReading(data, 'me', views, sessions)?.book.id).toBe('a')
  })

  it('la pila son los pendientes que nadie tiene abiertos', () => {
    const data = db(
      [book('a'), book('bb')],
      [reading('1', 'me', 'a', { status: 'pendiente' }), reading('2', 'me', 'bb', { status: 'pendiente' }),
       reading('3', 'you', 'bb')],
    )
    expect(pile(bookViews(data, 'me')).map((v) => v.book.id)).toEqual(['a'])
  })

  it('la estantería ordena por el año en que el primero de los dos lo terminó', () => {
    const data = db(
      [book('a'), book('bb'), book('ccc')],
      [
        reading('1', 'me', 'a', { status: 'terminado', finished_on: '2026-03-01' }),
        reading('2', 'you', 'a', { status: 'terminado', finished_on: '2025-12-30' }),
        reading('3', 'me', 'bb', { status: 'terminado', finished_on: '2026-02-01' }),
        reading('4', 'me', 'ccc', { status: 'terminado', finished_on: '2026-01-15' }),
      ],
    )
    const result = shelves(bookViews(data, 'me'))
    expect(result.map((s) => s.year)).toEqual([2026, 2025])
    expect(result[0].books.map((v) => v.book.id)).toEqual(['ccc', 'bb'])
    expect(result[1].books.map((v) => v.book.id)).toEqual(['a'])
  })

  it('un libro está dejado solo si nadie lo sigue ni lo terminó', () => {
    const data = db(
      [book('a'), book('bb')],
      [reading('1', 'me', 'a', { status: 'dejado' }), reading('2', 'me', 'bb', { status: 'dejado' }),
       reading('3', 'you', 'bb', { status: 'terminado', finished_on: '2026-01-01' })],
    )
    expect(dropped(bookViews(data, 'me')).map((v) => v.book.id)).toEqual(['a'])
  })
})

describe('la vela', () => {
  const now = Date.parse('2026-11-10T22:00:00Z')
  it('arde tres horas y luego ya no cuenta como presencia', () => {
    expect(isLit({ candle_lit_at: '2026-11-10T21:30:00Z' }, now)).toBe(true)
    expect(isLit({ candle_lit_at: '2026-11-10T18:59:00Z' }, now)).toBe(false)
    expect(isLit({ candle_lit_at: null }, now)).toBe(false)
    expect(isLit(null, now)).toBe(false)
  })
  it('tolera unos minutos de diferencia entre los dos relojes', () => {
    expect(isLit({ candle_lit_at: '2026-11-10T22:03:00Z' }, now)).toBe(true)
  })
  it('se consume poco a poco', () => {
    expect(waxLeft('2026-11-10T22:00:00Z', now)).toBe(1)
    expect(waxLeft('2026-11-10T20:30:00Z', now)).toBe(0.5)
    expect(waxLeft('2026-11-10T10:00:00Z', now)).toBe(0)
  })
})

describe('veladas', () => {
  it('suma noches y minutos y dice dónde se leyó más', () => {
    const sessions = [
      session('1', '2026-11-01T22:00:00Z', { place: 'en la cama' }),
      session('1', '2026-11-01T23:00:00Z', { place: 'en la cama', minutes: 15 }),
      session('1', '2026-11-02T08:00:00Z', { place: 'en el tren', minutes: null }),
    ]
    expect(tally(sessions)).toEqual({ nights: 2, minutes: 45, place: 'en la cama' })
  })
})
