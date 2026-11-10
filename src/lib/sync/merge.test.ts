import { describe, expect, it } from 'vitest'
import { advance, keyOf, mergePull, uploadOrder, type Pulled } from './merge'
import { emptyDb, type Reading, type Slip } from '../types'

const nothing: Pulled = { profiles: [], books: [], readings: [], sessions: [], slips: [] }
const reading = (id: string, position: number, extra: Partial<Reading> = {}) =>
  ({ id, position, updated_at: '2026-11-10T10:00:00Z', deleted_at: null, ...extra }) as Reading
const slip = (id: string, body: string | null) => ({ id, body, deleted_at: null }) as Slip

describe('sincronizar', () => {
  it('lo que llega del servidor sustituye a lo local', () => {
    const db = { ...emptyDb(), readings: { r: reading('r', 10) } }
    const next = mergePull(db, new Set(), { ...nothing, readings: [reading('r', 40)] })
    expect(next.readings.r.position).toBe(40)
  })

  it('un cambio local que aún no ha subido no se pisa', () => {
    const db = { ...emptyDb(), readings: { r: reading('r', 55) } }
    const next = mergePull(db, new Set([keyOf('readings', 'r')]), { ...nothing, readings: [reading('r', 40)] })
    expect(next.readings.r.position).toBe(55)
  })

  it('lo borrado en el otro móvil desaparece aquí', () => {
    const db = { ...emptyDb(), readings: { r: reading('r', 10) } }
    const next = mergePull(db, new Set(), { ...nothing, readings: [reading('r', 10, { deleted_at: 'x' })] })
    expect(next.readings.r).toBeUndefined()
  })

  it('no toca el estado anterior', () => {
    const db = { ...emptyDb(), readings: { r: reading('r', 10) } }
    mergePull(db, new Set(), { ...nothing, readings: [reading('r', 40)] })
    expect(db.readings.r.position).toBe(10)
  })

  it('los papeles llegan enteros: los que ya no vienen se van, salvo los que esperan subir', () => {
    const db = { ...emptyDb(), slips: { viejo: slip('viejo', 'a'), mio: slip('mio', 'sin subir'), doblado: slip('doblado', null) } }
    const next = mergePull(db, new Set([keyOf('slips', 'mio')]), { ...nothing, slips: [slip('doblado', 'ya abierto')] })
    expect(Object.keys(next.slips).sort()).toEqual(['doblado', 'mio'])
    expect(next.slips.doblado.body).toBe('ya abierto')
  })

  it('el cursor avanza hasta la fila más reciente de cada tabla', () => {
    const cursors = advance({ readings: '2026-11-10T09:00:00Z' }, {
      ...nothing,
      readings: [reading('a', 1, { updated_at: '2026-11-10T11:00:00Z' }), reading('b', 1)],
    })
    expect(cursors).toEqual({ readings: '2026-11-10T11:00:00Z' })
  })

  it('sube primero el libro, luego el marcapáginas, luego la velada', () => {
    const order = uploadOrder(['sessions:s', 'profiles:p', 'readings:r', 'slips:x', 'books:b'])
    expect(order.map((o) => o.table)).toEqual(['books', 'readings', 'sessions', 'slips', 'profiles'])
    expect(order[0].id).toBe('b')
  })
})
