import { describe, expect, it } from 'vitest'
import { coverCrop, isCover } from './photo'

describe('portadas con foto', () => {
  it('una foto se recorta centrada a la proporción de un libro', () => {
    // Apaisada: sobra por los lados.
    expect(coverCrop(3000, 1500)).toEqual({ x: 1000, y: 0, w: 1000, h: 1500 })
    // Muy alta: sobra por arriba y por abajo.
    expect(coverCrop(1000, 3000)).toEqual({ x: 0, y: 750, w: 1000, h: 1500 })
    // Ya es 2:3: entera.
    expect(coverCrop(400, 600)).toEqual({ x: 0, y: 0, w: 400, h: 600 })
  })

  it('vale una dirección https o una foto pequeña; nada más', () => {
    expect(isCover('https://covers.openlibrary.org/b/id/42-M.jpg')).toBe(true)
    expect(isCover('data:image/jpeg;base64,AAAA')).toBe(true)
    expect(isCover('http://sin-cifrar.example/x.jpg')).toBe(false)
    expect(isCover('data:text/html;base64,AAAA')).toBe(false)
    expect(isCover(`data:image/jpeg;base64,${'A'.repeat(200_001)}`)).toBe(false)
    expect(isCover(null)).toBe(false)
  })
})
