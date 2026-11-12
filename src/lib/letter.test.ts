import { describe, expect, it } from 'vitest'
import { letterFor, letterYears } from './letter'
import { emptyDb, type Book, type Db, type Profile, type Reading, type Session, type Slip } from './types'

const book = (id: string) => ({ id, title: id, deleted_at: null }) as Book
const reading = (user_id: string, book_id: string, finished_on: string, rating: number | null = null) =>
  ({ id: `${book_id}-${user_id}`, user_id, book_id, status: 'terminado', finished_on, rating, total: 100, position: 100, updated_at: '', deleted_at: null }) as Reading
const session = (user_id: string, day: string, minutes = 30, place: string | null = null) =>
  ({ id: `${user_id}-${day}`, user_id, day, minutes, place, reading_id: 'r', deleted_at: null }) as Session
const slip = (id: string, user_id: string, created_at: string, extra: Partial<Slip> = {}) =>
  ({ id, user_id, book_id: 'a', kind: 'nota', at: 0.5, body: 'texto', loved: false, created_at, deleted_at: null, ...extra }) as Slip
const rows = <T extends { id: string }>(list: T[]) => Object.fromEntries(list.map((row) => [row.id, row]))

const db: Db = {
  ...emptyDb(),
  profiles: rows([{ id: 'me', partner_id: 'you' } as Profile, { id: 'you', partner_id: 'me' } as Profile]),
  books: rows([book('a'), book('b'), book('c')]),
  readings: rows([
    reading('me', 'a', '2026-02-01', 5), reading('you', 'a', '2026-03-01', 3),
    reading('me', 'b', '2026-05-01', 4),
    reading('you', 'c', '2025-06-01', 5),
  ]),
  sessions: rows([
    session('me', '2026-01-10', 30, 'en la cama'), session('you', '2026-01-10', 40, 'en la cama'),
    session('me', '2026-03-02'), session('you', '2026-03-02'),
    session('me', '2026-03-03'), session('you', '2026-03-03'),
    session('me', '2026-03-04'), session('you', '2026-03-04', 20, 'en el sofá'),
    session('me', '2026-04-01'),
    session('me', '2025-12-31'), session('you', '2025-12-31'),
  ]),
  slips: rows([
    slip('s1', 'me', '2026-02-01T10:00:00Z', { loved: true }),
    slip('s2', 'you', '2026-02-02T10:00:00Z', { loved: true, body: null, locked: true }),
    slip('s3', 'you', '2026-02-03T10:00:00Z'),
    slip('s4', 'you', '2026-02-04T10:00:00Z', { at: null }),
    slip('s5', 'me', '2025-02-01T10:00:00Z', { loved: true }),
  ]),
}

describe('la carta del año', () => {
  it('suma lo de los dos sin decir quién leyó más', () => {
    const letter = letterFor(db, 'me', 2026)!
    expect(letter.books.map((v) => v.book.id)).toEqual(['a', 'b'])
    expect(letter.together.map((v) => v.book.id)).toEqual(['a'])
    expect(letter.favourites.map((v) => v.book.id)).toEqual(['a'])
    expect([letter.nights, letter.shared]).toEqual([5, 4])
    expect(letter.minutes).toBe(30 + 40 + 30 * 5 + 20 + 30)
    expect(letter.place).toBe('en la cama')
    expect(letter.month).toBe(2)
  })
  it('cuenta las notas entre páginas de ese año y cita solo las queridas que puedo leer', () => {
    const letter = letterFor(db, 'me', 2026)!
    expect(letter.notes).toBe(3)
    expect(letter.loved.map((s) => s.id)).toEqual(['s1'])
  })
  it('un año sin nada no tiene carta, y los años salen del más nuevo al más viejo', () => {
    expect(letterFor(db, 'me', 2020)).toBeNull()
    expect(letterYears(db, 'me')).toEqual([2026, 2025])
  })
  it('sin un mes que destaque, no nombra ninguno', () => {
    expect(letterFor(db, 'me', 2025)!.month).toBeNull()
  })
})
