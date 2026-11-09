import { describe, expect, it } from 'vitest'
import { streakAfterSave, streakInvite } from './streakLines'

const days = (...dates: string[]) => new Set(dates)
const today = '2026-11-09'

describe('streakInvite', () => {
  it('uses the couple streak when there is a partner', () => {
    const mine = days('2026-11-07', '2026-11-08')
    const theirs = days('2026-11-07', '2026-11-08')
    expect(streakInvite(mine, theirs, today, 'Ana')).toBe('Racha de los dos: 2 días · un ratito hoy y sigue')
  })

  it('says what your reading adds when your partner has already read today', () => {
    const mine = days('2026-11-08')
    const theirs = days('2026-11-08', today)
    expect(streakInvite(mine, theirs, today, 'Ana')).toBe('Ana ya ha leído hoy · con tu ratito, la racha llega a 2 días')
  })

  it('waits for the partner once you have read', () => {
    expect(streakInvite(days(today), days(), today, 'Ana')).toBe('Hoy ya has leído · falta Ana para la racha de los dos')
    expect(streakInvite(days(today), days(today), today, 'Ana')).toBe('Hoy habéis leído los dos · racha de 1 día')
  })

  it('keeps the personal streak without a partner', () => {
    expect(streakInvite(days('2026-11-08'), null, today, '')).toBe('Racha de 1 día · un ratito hoy y sigue')
    expect(streakInvite(days(), null, today, '')).toBe('Un ratito hoy y empieza tu racha')
  })
})

describe('streakAfterSave', () => {
  it('counts today once both have read', () => {
    expect(streakAfterSave(days('2026-11-08', today), days('2026-11-08', today), today, 'Ana')).toBe('Racha de los dos: 2 días')
  })

  it('reminds who is missing today', () => {
    expect(streakAfterSave(days('2026-11-08', today), days('2026-11-08'), today, 'Ana')).toBe('Racha de los dos: 1 día · falta Ana hoy')
    expect(streakAfterSave(days(today), days(), today, 'Ana')).toBe('Falta Ana para empezar vuestra racha')
  })

  it('handles a night session saved for yesterday', () => {
    expect(streakAfterSave(days('2026-11-08'), days('2026-11-08'), today, 'Ana')).toBe('Racha de los dos: 1 día')
  })
})
