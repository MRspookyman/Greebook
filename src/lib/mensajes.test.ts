import { describe, expect, it } from 'vitest'
import { candleNotice, excerpt, finishedNotice, foundNotice, slipNotice } from '../../supabase/functions/_shared/mensajes'

const slip = { name: 'Javier', book: 'Rayuela', bookId: 'b1', kind: 'nota' as const, page: 150, body: 'Cuando llegues aquí, mírame.', locked: false }

describe('avisos', () => {
  it('la vela dice quién y qué lee', () => {
    expect(candleNotice('Laura', 'Rayuela')).toEqual({
      title: '🕯️ Laura ha encendido su vela', body: 'Está leyendo «Rayuela». ¿Enciendes la tuya?', url: '/', tag: 'vela',
    })
    expect(candleNotice('Laura', null).body).toBe('¿Enciendes la tuya?')
  })

  it('un papel abierto enseña su texto y lleva a su libro', () => {
    const push = slipNotice(slip)
    expect(push.body).toBe('«Rayuela»: Cuando llegues aquí, mírame.')
    expect(push.url).toBe('/libro/b1#papeles')
  })

  it('un papel doblado nunca viaja con su texto', () => {
    const push = slipNotice({ ...slip, locked: true })
    expect(push.body).toBe('«Rayuela», hacia la página 150. Lo encontrarás al llegar.')
    expect(JSON.stringify(push)).not.toContain('mírame')
  })

  it('lo del sobre no enseña nada, esté o no abierto', () => {
    for (const locked of [true, false]) {
      const push = slipNotice({ ...slip, kind: 'carta', locked })
      expect(push.title).toBe('📝 Javier ha escrito su nota final')
      expect(push.url).toBe('/libro/b1#sobre')
      expect(JSON.stringify(push)).not.toContain('mírame')
    }
  })

  it('avisa del hallazgo y del final', () => {
    expect(foundNotice('Laura', 'Rayuela', 'b1', false).title).toBe('📄 Laura ha encontrado tu papel')
    expect(foundNotice('Laura', 'Rayuela', 'b1', true).title).toBe('📝 Laura ha leído tu nota final')
    expect(finishedNotice('Laura', 'Rayuela', 'b1', true).body).toBe('Lo habéis cerrado los dos. Mirad vuestras notas finales.')
    expect(finishedNotice('Laura', 'Rayuela', 'b1', false).body).toBe('Ya está en vuestra estantería.')
  })

  it('recorta los textos largos', () => {
    expect(excerpt('a'.repeat(120))).toHaveLength(90)
    expect(excerpt('  hola\n  mundo ')).toBe('hola mundo')
  })
})
