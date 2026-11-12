import { describe, expect, it } from 'vitest'
import { lastNights, nightsLine, nightsOf, runEndingAt, sharedNights } from './nights'
import { nightOf } from './time'
import type { Session } from './types'

const session = (user_id: string, day: string, deleted_at: string | null = null) =>
  ({ user_id, day, deleted_at }) as Session

describe('noches', () => {
  it('leer a las 00:30 cuenta para la noche anterior; a las 4 ya es otro día', () => {
    expect(nightOf(new Date(2026, 10, 11, 0, 30))).toBe('2026-11-10')
    expect(nightOf(new Date(2026, 10, 11, 3, 59))).toBe('2026-11-10')
    expect(nightOf(new Date(2026, 10, 11, 4, 0))).toBe('2026-11-11')
    expect(nightOf(new Date(2026, 0, 1, 1, 0))).toBe('2025-12-31')
  })

  it('reúne las noches de cada uno sin contar veladas borradas', () => {
    const sessions = [session('a', '2026-11-08'), session('a', '2026-11-08'), session('a', '2026-11-09', 'x'), session('b', '2026-11-08')]
    expect([...nightsOf(sessions, 'a')]).toEqual(['2026-11-08'])
  })

  it('las noches de los dos son las que coinciden', () => {
    const mine = new Set(['2026-11-07', '2026-11-08', '2026-11-10'])
    const theirs = new Set(['2026-11-08', '2026-11-09', '2026-11-10'])
    expect(sharedNights(mine, theirs)).toEqual(['2026-11-08', '2026-11-10'])
  })

  it('las seguidas no se cortan mientras la noche de hoy sigue abierta', () => {
    const days = new Set(['2026-11-07', '2026-11-08', '2026-11-09'])
    expect(runEndingAt(days, '2026-11-09')).toBe(3)
    expect(runEndingAt(days, '2026-11-10')).toBe(3)
    expect(runEndingAt(days, '2026-11-11')).toBe(0)
  })

  it('cuenta hacia arriba y solo menciona las seguidas cuando añaden algo', () => {
    expect(nightsLine([], '2026-11-10')).toBeNull()
    expect(nightsLine(['2026-11-10'], '2026-11-10')).toBe('Una noche leyendo los dos')
    expect(nightsLine(['2026-11-01', '2026-11-10'], '2026-11-10')).toBe('2 noches leyendo los dos')
    expect(nightsLine(['2026-10-01', '2026-11-08', '2026-11-09', '2026-11-10'], '2026-11-10')).toBe(
      '4 noches leyendo los dos · 3 seguidas',
    )
  })

  it('las últimas siete noches acaban en la de hoy y marcan las que fueron de los dos', () => {
    const week = lastNights(['2026-11-10', '2026-11-12', '2026-10-01'], '2026-11-12')
    expect(week.map((night) => night.letter).join('')).toBe('VSDLMXJ')
    expect(week.filter((night) => night.shared).map((night) => night.day)).toEqual(['2026-11-10', '2026-11-12'])
    expect(week.at(-1)).toMatchObject({ day: '2026-11-12', tonight: true })
    expect(week.filter((night) => night.tonight)).toHaveLength(1)
  })
})
