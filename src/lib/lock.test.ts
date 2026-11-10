import { describe, expect, it } from 'vitest'
import { isLocked } from './lock'

const mark = (status: 'pendiente' | 'leyendo' | 'terminado' | 'dejado', position: number, total = 300) => ({ status, position, total })

describe('las notas', () => {
  it('se ven siempre, vaya por donde vaya quien mira', () => {
    for (const kind of ['nota', 'cita', 'carta', 'prediccion'] as const) {
      expect(isLocked({ user_id: 'laura', kind, at: 0.9 }, 'javier', mark('leyendo', 10), mark('leyendo', 250), false)).toBe(false)
      expect(isLocked({ user_id: 'laura', kind, at: null }, 'javier', mark('pendiente', 0), null, false)).toBe(false)
    }
  })
})
