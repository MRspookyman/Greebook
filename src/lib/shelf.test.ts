import { describe, expect, it } from 'vitest'
import { shelfRows, spineOf } from './shelf'

describe('la estantería', () => {
  it('un libro tiene siempre el mismo lomo', () => {
    const book = { id: '6f1c2a7e-0000-4000-8000-000000000001', pages: 384 }
    expect(spineOf(book)).toEqual(spineOf({ ...book }))
  })

  it('los libros gordos tienen el lomo más ancho, dentro de unos límites', () => {
    const id = 'x'
    expect(spineOf({ id, pages: 90 }).width).toBe(26)
    expect(spineOf({ id, pages: 400 }).width).toBe(43)
    expect(spineOf({ id, pages: 1200 }).width).toBe(52)
    expect(spineOf({ id, pages: null }).width).toBe(36)
  })

  it('llena cada balda y pasa a la siguiente cuando no cabe', () => {
    const w = (width: number) => ({ width })
    expect(shelfRows([w(40), w(40), w(40)], 100, 5).map((row) => row.length)).toEqual([2, 1])
    expect(shelfRows([w(40), w(55)], 100, 5).map((row) => row.length)).toEqual([2])
    expect(shelfRows([], 100)).toEqual([])
  })

  it('un lomo más ancho que la balda ocupa una para él', () => {
    expect(shelfRows([{ width: 300 }, { width: 20 }], 100).map((row) => row.length)).toEqual([1, 1])
  })
})
