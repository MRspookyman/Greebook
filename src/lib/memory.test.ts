import { describe, expect, it } from 'vitest'
import { memoryFor, memoryLine } from './memory'
import type { BookView } from './model'
import type { Book, Reading } from './types'

const view = (id: string, mine?: string, theirs?: string): BookView => ({
  book: { id, title: id } as Book,
  mine: mine ? ({ id: `${id}-m`, status: 'terminado', finished_on: mine } as Reading) : undefined,
  theirs: theirs ? ({ id: `${id}-t`, status: 'terminado', finished_on: theirs } as Reading) : undefined,
})
const all = new Set(['a-m', 'a-t', 'b-m', 'b-t', 'c-m'])

describe('recuerdos', () => {
  it('devuelve el libro terminado tal día como hoy', () => {
    const memory = memoryFor([view('a', '2025-11-10'), view('b', '2025-11-09')], '2026-11-10', all)
    expect(memory).toMatchObject({ book: { id: 'a' }, years: 1, who: 'mine' })
    expect(memoryLine(memory!, 'Javier')).toBe('Hoy hace un año terminabas')
  })
  it('no recuerda lo de hoy mismo ni lo añadido como «ya lo leí»', () => {
    expect(memoryFor([view('a', '2026-11-10')], '2026-11-10', all)).toBeNull()
    expect(memoryFor([view('a', '2025-11-10')], '2026-11-10', new Set())).toBeNull()
  })
  it('prefiere lo más reciente y lo que leísteis los dos', () => {
    const views = [view('a', '2023-11-10'), view('b', '2025-11-10', '2025-11-10'), view('c', '2025-11-10')]
    const memory = memoryFor(views, '2026-11-10', all)
    expect(memory).toMatchObject({ book: { id: 'b' }, who: 'both' })
    expect(memoryLine(memory!, 'Javier')).toBe('Hoy hace un año terminabais')
  })
  it('también lo que terminó el otro, y en plural de años', () => {
    const memory = memoryFor([view('a', undefined, '2023-11-10')], '2026-11-10', all)
    expect(memoryLine(memory!, 'Javier')).toBe('Hoy hace 3 años Javier terminaba')
  })
})
