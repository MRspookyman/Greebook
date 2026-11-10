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

  it('una carta o predicción de antes se avisa como cualquier nota', () => {
    const push = slipNotice({ ...slip, kind: 'carta' })
    expect(push.title).toBe('📄 Javier ha dejado una nota')
    expect(push.url).toBe('/libro/b1#papeles')
  })

  it('leer una nota y terminar un libro', () => {
    expect(foundNotice('Laura', 'Rayuela', 'b1').title).toBe('📄 Laura ha leído tu nota')
    expect(finishedNotice('Laura', 'Rayuela', 'b1', true).body).toBe('Lo habéis cerrado los dos.')
    expect(finishedNotice('Laura', 'Rayuela', 'b1', false).url).toBe('/libro/b1')
  })

  it('recorta los textos largos', () => {
    expect(excerpt('a'.repeat(120))).toHaveLength(90)
    expect(excerpt('  hola\n  mundo ')).toBe('hola mundo')
  })
})
