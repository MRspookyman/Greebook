import { describe, expect, it } from 'vitest'
import { dripsFor, glowOf } from './candle'

describe('la vela se gasta', () => {
  it('nueva alumbra entera; gastada pierde más de la mitad, y cada vez más deprisa', () => {
    expect(glowOf(1)).toEqual({ reach: 1, strength: 1 })
    const half = glowOf(0.5), end = glowOf(0)
    expect(end.reach).toBeLessThan(0.45)
    expect(end.strength).toBeLessThan(0.5)
    expect(1 - half.reach).toBeLessThan((1 - end.reach) / 2)
    expect(glowOf(-3)).toEqual(end)
  })

  it('recién encendida no gotea; con el tiempo van cayendo más regueros', () => {
    expect(dripsFor(1, 140)).toHaveLength(0)
    expect(dripsFor(0.9, 140)).toHaveLength(1)
    expect(dripsFor(0.5, 100).length).toBeGreaterThan(dripsFor(0.8, 100).length)
    expect(dripsFor(0, 60)).toHaveLength(6)
  })

  it('un reguero crece hasta el plato y allí hace charco', () => {
    const early = dripsFor(0.93, 140)[0], later = dripsFor(0.8, 120)[0], landed = dripsFor(0.3, 90)[0]
    expect(early.length).toBeLessThan(later.length)
    expect(early.landed).toBe(false)
    expect(early.pool).toBe(0)
    expect(landed.landed).toBe(true)
    expect(landed.length).toBe(90)
    expect(landed.pool).toBeGreaterThan(3)
  })
})
