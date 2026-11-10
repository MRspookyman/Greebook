import { describe, expect, it } from 'vitest'
import { fitWithin } from './cover'

describe('foto de portada', () => {
  it('reduce el lado mayor al máximo y mantiene la proporción', () => {
    expect(fitWithin(3000, 4000)).toEqual({ width: 540, height: 720 })
    expect(fitWithin(4000, 3000)).toEqual({ width: 720, height: 540 })
  })
  it('no agranda una imagen pequeña', () => {
    expect(fitWithin(300, 450)).toEqual({ width: 300, height: 450 })
  })
  it('nunca devuelve un lado de cero', () => {
    expect(fitWithin(5000, 2)).toEqual({ width: 720, height: 1 })
  })
})
