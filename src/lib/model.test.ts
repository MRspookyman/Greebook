import { describe, expect, it } from 'vitest'
import {
  bookViews, byNewest, candleReading, dropped, heldBy, isLit, isNext, matchesStars, matchesText, ratingOf, sortViews, nightstand, pile, shelves, standGroups, tally, waxLeft,
} from './model'
import { stepMinutes } from './time'
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

describe('de quién es cada libro', () => {
  const data = db(
    [book('a'), book('bb'), book('ccc'), book('dddd')],
    [
      reading('1', 'me', 'a'), reading('2', 'you', 'a'),
      reading('3', 'me', 'bb'), reading('4', 'you', 'bb', { status: 'terminado', finished_on: '2026-03-01' }),
      reading('5', 'you', 'ccc'), reading('6', 'me', 'ccc', { status: 'pendiente' }),
      reading('7', 'me', 'dddd', { status: 'pendiente' }),
    ],
  )
  const views = bookViews(data, 'me')

  it('la mesilla se reparte en los dos, tú y el otro, según quién lo tenga abierto', () => {
    const groups = standGroups(nightstand(views, []))
    expect(groups.both.map((v) => v.book.id)).toEqual(['a'])
    expect(groups.mine.map((v) => v.book.id)).toEqual(['bb'])
    expect(groups.theirs.map((v) => v.book.id)).toEqual(['ccc'])
  })

  it('el filtro de la estantería mira solo los marcapáginas en ese estado', () => {
    const [, bb, ccc] = views
    expect(heldBy(bb, 'tu', 'terminado')).toBe(true)
    expect(heldBy(bb, 'yo', 'terminado')).toBe(false)
    expect(heldBy(bb, 'dos', 'terminado')).toBe(false)
    expect(heldBy(bb, 'todos', 'terminado')).toBe(true)
    expect(heldBy(ccc, 'yo', 'pendiente')).toBe(true)
  })

  it('«el siguiente» va el primero de la pila', () => {
    const more = bookViews(
      db([book('a'), book('bb')], [reading('1', 'me', 'a', { status: 'pendiente' }), reading('2', 'me', 'bb', { status: 'pendiente' })]),
      'me',
    )
    expect(pile(more).map((v) => v.book.id)).toEqual(['a', 'bb'])
    more[1].mine!.next_at = '2026-11-10T10:00:00Z'
    expect(pile(more).map((v) => v.book.id)).toEqual(['bb', 'a'])
    // Once it is open it is no longer «el siguiente».
    expect(isNext({ ...more[1].mine!, status: 'leyendo' })).toBe(false)
  })

  it('las veladas se ordenan de la más reciente a la más antigua', () => {
    const list = [session('1', '2026-11-01T22:00:00Z'), session('1', '2026-11-09T22:00:00Z')]
    expect(byNewest(list).map((s) => s.day)).toEqual(['2026-11-09', '2026-11-01'])
  })
})

describe('los minutos de una velada', () => {
  it('los botones van de cinco en cinco y caen en números redondos', () => {
    expect(stepMinutes(23, -1)).toBe(20)
    expect(stepMinutes(23, 1)).toBe(25)
    expect(stepMinutes(20, -1)).toBe(15)
    expect(stepMinutes(20, 1)).toBe(25)
  })

  it('no bajan del mínimo ni pasan del máximo', () => {
    expect(stepMinutes(3, -1)).toBe(1)
    expect(stepMinutes(1, 1)).toBe(5)
    expect(stepMinutes(5, -1, 0)).toBe(0)
    expect(stepMinutes(598, 1)).toBe(600)
  })
})

describe('buscar y ordenar la estantería', () => {
  const done = (rating: number | null) => ({ status: 'terminado' as const, finished_on: '2026-03-01', rating })
  const views = bookViews(
    db(
      [book('a', { title: 'Patria', author: 'Fernando Aramburu' }), book('bb', { title: 'El camino', author: 'Miguel Delibes' }), book('ccc', { title: 'Árbol', author: '' })],
      [reading('1', 'me', 'a', done(3)), reading('2', 'you', 'a', done(5)), reading('3', 'you', 'bb', done(4)), reading('4', 'me', 'ccc', done(null))],
    ),
    'me',
  )
  const ids = (list: typeof views) => list.map((v) => v.book.id)

  it('las estrellas que se enseñan son las mías, o las del otro si yo no puse', () => {
    expect(views.map((v) => ratingOf(v))).toEqual([3, 4, null])
    expect(ratingOf(views[0], 'tu')).toBe(5)
    expect(ratingOf(views[1], 'yo')).toBeNull()
  })

  it('busca por título o autor sin importar acentos ni mayúsculas', () => {
    expect(ids(views.filter((v) => matchesText(v, 'arbol')))).toEqual(['ccc'])
    expect(ids(views.filter((v) => matchesText(v, 'DELIBES')))).toEqual(['bb'])
    expect(views.filter((v) => matchesText(v, '  '))).toHaveLength(3)
  })

  it('filtra por estrellas, y aparta los que nadie ha puntuado', () => {
    expect(ids(views.filter((v) => matchesStars(v, 4)))).toEqual(['bb'])
    expect(ids(views.filter((v) => matchesStars(v, -1)))).toEqual(['ccc'])
    expect(views.filter((v) => matchesStars(v, 0))).toHaveLength(3)
  })

  it('ordena por título, autor o puntuación', () => {
    expect(ids(sortViews(views, 'titulo'))).toEqual(['ccc', 'bb', 'a'])
    expect(ids(sortViews(views, 'autor'))).toEqual(['a', 'bb', 'ccc'])
    expect(ids(sortViews(views, 'puntuacion'))).toEqual(['bb', 'a', 'ccc'])
  })
})
