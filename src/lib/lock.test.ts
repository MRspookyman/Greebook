import { describe, expect, it } from 'vitest'
import { fractionOf, isLocked } from './lock'
import type { Reading } from './types'

const mark = (status: Reading['status'], position = 0, total = 300) => ({ status, position, total })
const nota = { user_id: 'laura', kind: 'nota' as const, at: 0.5 }
const carta = { user_id: 'laura', kind: 'carta' as const, at: null }
const prediccion = { user_id: 'laura', kind: 'prediccion' as const, at: null }

describe('papeles entre páginas', () => {
  it('nunca dobla un papel para quien lo escribió', () => {
    expect(isLocked(nota, 'laura', mark('leyendo', 0), null, false)).toBe(false)
  })

  it('queda doblado hasta llegar a su punto del libro', () => {
    expect(isLocked(nota, 'javier', mark('leyendo', 149), null, false)).toBe(true)
    expect(isLocked(nota, 'javier', mark('leyendo', 150), null, false)).toBe(false)
  })

  it('compara por fracción: ediciones distintas y Kindle se entienden', () => {
    // Laura lo dejó en la 137 de 384; Javier lee en Kindle, en %.
    const at = fractionOf(137, 384)
    expect(isLocked({ ...nota, at }, 'javier', mark('leyendo', 35, 100), null, false)).toBe(true)
    expect(isLocked({ ...nota, at }, 'javier', mark('leyendo', 36, 100), null, false)).toBe(false)
  })

  it('no se queda doblado por un redondeo en la misma página', () => {
    const at = fractionOf(2, 3)
    expect(isLocked({ ...nota, at }, 'javier', mark('leyendo', 2, 3), null, false)).toBe(false)
  })

  it('también espera si el libro está en la pila de pendientes', () => {
    expect(isLocked(nota, 'javier', mark('pendiente', 0), null, false)).toBe(true)
  })

  it('se lee sin más si no lees ese libro, lo terminaste o lo dejaste', () => {
    expect(isLocked(nota, 'javier', null, null, false)).toBe(false)
    expect(isLocked(nota, 'javier', mark('terminado', 300), null, false)).toBe(false)
    expect(isLocked(nota, 'javier', mark('dejado', 40), null, false)).toBe(false)
  })

  it('un papel sin página no destripa nada y no se dobla', () => {
    expect(isLocked({ ...nota, at: null }, 'javier', mark('leyendo', 0), null, false)).toBe(false)
  })
})

describe('el sobre', () => {
  it('la carta espera a que termines y escribas la tuya', () => {
    expect(isLocked(carta, 'javier', mark('leyendo', 200), mark('terminado', 300), false)).toBe(true)
    expect(isLocked(carta, 'javier', mark('terminado', 300), mark('terminado', 300), false)).toBe(true)
    expect(isLocked(carta, 'javier', mark('terminado', 300), mark('terminado', 300), true)).toBe(false)
  })

  it('la carta se lee si no vas a leer el libro', () => {
    expect(isLocked(carta, 'javier', null, mark('terminado', 300), false)).toBe(false)
    expect(isLocked(carta, 'javier', mark('dejado', 10), mark('terminado', 300), false)).toBe(false)
  })

  it('la predicción se abre cuando los dos habéis cerrado el libro', () => {
    expect(isLocked(prediccion, 'javier', mark('leyendo', 10), mark('leyendo', 10), false)).toBe(true)
    expect(isLocked(prediccion, 'javier', mark('terminado', 300), mark('leyendo', 10), false)).toBe(true)
    expect(isLocked(prediccion, 'javier', mark('leyendo', 10), mark('terminado', 300), false)).toBe(true)
    expect(isLocked(prediccion, 'javier', mark('terminado', 300), mark('terminado', 300), false)).toBe(false)
    expect(isLocked(prediccion, 'javier', null, mark('dejado', 80), false)).toBe(false)
  })
})

describe('fractionOf', () => {
  it('se queda entre 0 y 1 con cinco decimales', () => {
    expect(fractionOf(137, 384)).toBe(0.35677)
    expect(fractionOf(500, 300)).toBe(1)
    expect(fractionOf(5, 0)).toBe(0)
  })
})
