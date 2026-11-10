import { describe, expect, it } from 'vitest'
import { formatVerdict, parseVerdict } from './verdict'

describe('la valoración del sobre', () => {
  it('guarda estrellas y palabras juntas y las recupera', () => {
    const body = formatVerdict(4, '  Me quedo con el final.\nY contigo. ')
    expect(body).toBe('★4\nMe quedo con el final.\nY contigo.')
    expect(parseVerdict(body)).toEqual({ rating: 4, text: 'Me quedo con el final.\nY contigo.' })
  })
  it('vale con solo estrellas o solo palabras', () => {
    expect(parseVerdict(formatVerdict(5, ''))).toEqual({ rating: 5, text: '' })
    expect(parseVerdict(formatVerdict(null, 'Sin nota'))).toEqual({ rating: null, text: 'Sin nota' })
    expect(formatVerdict(null, '  ')).toBe('')
  })
  it('una carta antigua sin estrellas se lee tal cual', () => {
    expect(parseVerdict('★ me encantó')).toEqual({ rating: null, text: '★ me encantó' })
    expect(parseVerdict(null)).toEqual({ rating: null, text: '' })
  })
})
