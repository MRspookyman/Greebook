import { describe, expect, it } from 'vitest'
import { isLocked } from './lock'

const mark = (status: 'pendiente' | 'leyendo' | 'terminado' | 'dejado', position: number, total = 300) => ({ status, position, total })

const note = (extra: { hidden?: boolean; at?: number | null } = {}) => ({ user_id: 'laura', at: 0.5, hidden: true, ...extra })

describe('las notas', () => {
  it('a la vista se lee siempre, vaya por donde vaya quien mira', () => {
    expect(isLocked(note({ hidden: false, at: 0.9 }), 'javier', mark('leyendo', 10))).toBe(false)
    expect(isLocked(note({ hidden: false }), 'javier', mark('pendiente', 0))).toBe(false)
  })

  it('oculta espera a que quien mira llegue a su página', () => {
    expect(isLocked(note(), 'javier', mark('leyendo', 149))).toBe(true)
    expect(isLocked(note(), 'javier', mark('pendiente', 0))).toBe(true)
    expect(isLocked(note(), 'javier', mark('leyendo', 150))).toBe(false)
  })

  it('oculta se lee si ya cerraste el libro, lo dejaste o no lo vas a leer', () => {
    expect(isLocked(note(), 'javier', mark('terminado', 300))).toBe(false)
    expect(isLocked(note(), 'javier', mark('dejado', 10))).toBe(false)
    expect(isLocked(note(), 'javier', null)).toBe(false)
  })

  it('nunca está oculta para quien la escribió, ni si es sobre el libro entero', () => {
    expect(isLocked(note(), 'laura', mark('leyendo', 10))).toBe(false)
    expect(isLocked(note({ at: null }), 'javier', mark('leyendo', 10))).toBe(false)
  })
})
