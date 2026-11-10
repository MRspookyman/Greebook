import { describe, expect, it } from 'vitest'
import { positionFor } from './lock'
import { envelopeOf, papersOf, slipPlace, waitingFor } from './slips'
import { emptyDb, type Book, type Db, type Reading, type Slip } from './types'

const book: Book = {
  id: 'b', title: 'Rayuela', author: '', cover_url: null, pages: 600, year: null, isbn: null, added_by: 'me',
  created_at: '', updated_at: '', deleted_at: null,
}
const reading = (user_id: string, extra: Partial<Reading> = {}): Reading => ({
  id: `r-${user_id}`, user_id, book_id: 'b', unit: 'paginas', total: 600, position: 100, status: 'leyendo',
  started_on: null, finished_on: null, rating: null, created_at: '', updated_at: '', deleted_at: null, ...extra,
})
let n = 0
const slip = (user_id: string, kind: Slip['kind'], extra: Partial<Slip> = {}): Slip => ({
  id: `s${++n}`, user_id, book_id: 'b', kind, page: null, at: null, body: 'texto', seen_at: null, loved: false,
  created_at: `2026-11-0${n % 9}T10:00:00Z`, updated_at: '', deleted_at: null, locked: false, ...extra,
})
const db = (readings: Reading[], slips: Slip[]): Db => ({
  ...emptyDb(),
  books: { b: book },
  readings: Object.fromEntries(readings.map((r) => [r.id, r])),
  slips: Object.fromEntries(slips.map((s) => [s.id, s])),
})

describe('dónde está un papel', () => {
  it('se dice en la edición de quien lo mira', () => {
    const at = 137 / 384
    expect(slipPlace({ at, page: 137 }, { unit: 'paginas', total: 384 })).toBe('p. 137')
    expect(slipPlace({ at, page: 137 }, { unit: 'paginas', total: 600 })).toBe('p. 215')
    expect(slipPlace({ at, page: 137 }, { unit: 'porcentaje', total: 100 })).toBe('36 %')
  })
  it('sin lector usa la página de quien lo escribió; sin página, nada', () => {
    expect(slipPlace({ at: 0.5, page: 150 }, undefined)).toBe('p. 150')
    expect(slipPlace({ at: null, page: null }, { unit: 'paginas', total: 300 })).toBe('')
  })
  it('la página que se anuncia es justo la que lo abre', () => {
    for (const [page, total] of [[137, 384], [2, 3], [1, 7], [599, 600]]) {
      const at = Math.round((page / total) * 1e5) / 1e5
      expect(positionFor(at, total)).toBe(page)
    }
  })
})

describe('entre páginas', () => {
  it('van en orden de lectura, con los que no tienen página delante', () => {
    const a = slip('me', 'nota', { at: 0.5 })
    const b = slip('you', 'cita', { at: 0.2 })
    const c = slip('me', 'nota')
    const d = slip('you', 'carta')
    const e = slip('me', 'cita', { at: 0.1, deleted_at: 'x' })
    expect(papersOf(db([], [a, b, c, d, e]), 'b').map((s) => s.id)).toEqual([c.id, b.id, a.id])
  })
})

describe('el sobre', () => {
  it('guarda una predicción y una carta de cada uno', () => {
    const mine = slip('me', 'prediccion')
    const theirs = slip('you', 'carta', { locked: true, body: null })
    const envelope = envelopeOf(db([], [mine, theirs, slip('me', 'nota')]), 'b', 'me')
    expect(envelope.mine.prediccion?.id).toBe(mine.id)
    expect(envelope.theirs.carta?.id).toBe(theirs.id)
    expect(envelope.sealed).toBe(true)
    expect(envelope.toOpen).toEqual([])
    expect(envelope.empty).toBe(false)
  })
  it('sabe qué se puede abrir ya', () => {
    const letter = slip('you', 'carta')
    const seen = slip('you', 'prediccion', { seen_at: 'x' })
    const envelope = envelopeOf(db([], [letter, seen]), 'b', 'me')
    expect(envelope.sealed).toBe(false)
    expect(envelope.toOpen.map((s) => s.id)).toEqual([letter.id])
  })
  it('vacío si nadie ha metido nada', () => {
    expect(envelopeOf(db([], [slip('me', 'nota')]), 'b', 'me').empty).toBe(true)
  })
})

describe('lo que te espera', () => {
  it('un papel suyo que ya puedes leer y no has abierto', () => {
    const found = slip('you', 'nota', { at: 0.1 })
    const result = waitingFor(db([reading('me')], [found, slip('you', 'nota', { seen_at: 'x' }), slip('me', 'nota')]), 'me')
    expect(result).toEqual([{ kind: 'papel', book, slip: found, opening: false }])
  })
  it('un papel doblado no espera… hasta que tu marcapáginas lo alcanza, aunque no haya red', () => {
    const folded = slip('you', 'nota', { at: 0.25, locked: true, body: null })
    expect(waitingFor(db([reading('me', { position: 149 })], [folded]), 'me')).toEqual([])
    expect(waitingFor(db([reading('me', { position: 150 })], [folded]), 'me')).toEqual([
      { kind: 'papel', book, slip: folded, opening: true },
    ])
  })
  it('un sobre con algo suyo por abrir', () => {
    const result = waitingFor(db([], [slip('you', 'carta'), slip('you', 'prediccion')]), 'me')
    expect(result).toEqual([{ kind: 'sobre', book, count: 2 }])
  })
  it('su carta, que se abre cuando escribas la tuya', () => {
    const theirs = slip('you', 'carta', { locked: true, body: null })
    expect(waitingFor(db([reading('me', { status: 'terminado' })], [theirs]), 'me')).toEqual([{ kind: 'carta', book }])
    expect(waitingFor(db([reading('me')], [theirs]), 'me')).toEqual([])
    expect(waitingFor(db([reading('me', { status: 'terminado' })], [theirs, slip('me', 'carta')]), 'me')).toEqual([])
  })
})
