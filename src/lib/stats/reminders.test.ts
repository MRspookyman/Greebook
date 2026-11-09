import { describe, expect, it } from 'vitest'
import { coupleStreak as sharedCoupleStreak } from '../../../supabase/functions/_shared/couple-streak.ts'
import { dailyReminderBody } from '../../../supabase/functions/_shared/daily-reminder.ts'
import { coupleStreak } from './streak'

const days = (...dates: string[]) => new Set(dates)

describe('shared couple streak for reminders', () => {
  it('uses the exact same implementation for client stats and Edge reminders', () => {
    expect(coupleStreak).toBe(sharedCoupleStreak)
  })

  it('keeps a wildcard-supported streak while the recipient has not read today', () => {
    const mine = days('2026-03-27', '2026-03-29')
    const theirs = days('2026-03-27', '2026-03-28', '2026-03-29', '2026-03-30')
    const streak = coupleStreak(mine, theirs, '2026-03-30')
    expect(streak.current).toBe(3)
    expect([...streak.wildcards]).toEqual(['2026-03-28'])
    expect(streak.wildcardsThisMonth).toBe(1)
    expect(streak.todayPending).toBe(true)
    expect(dailyReminderBody(streak.current, true, 'Ana')).toBe('Lleváis 3 días seguidos leyendo los dos')
  })

  it('does not replenish spent wildcards when a later streak starts in the same month', () => {
    const mine = days('2026-03-01', '2026-03-02', '2026-03-04', '2026-03-05')
    const theirs = days('2026-03-04')
    const streak = coupleStreak(mine, theirs, '2026-03-06')
    expect(streak.current).toBe(0)
    expect(streak.best).toBe(2)
    expect(streak.wildcardsThisMonth).toBe(2)
  })

  it('renews wildcards at the month boundary without spending one on pending today', () => {
    const mine = days('2026-03-30', '2026-03-31', '2026-04-01')
    const theirs = days('2026-03-30', '2026-04-02')
    const streak = coupleStreak(mine, theirs, '2026-04-02')
    expect(streak.current).toBe(3)
    expect([...streak.wildcards]).toEqual(['2026-03-31', '2026-04-01'])
    expect(streak.wildcardsThisMonth).toBe(1)
  })

  it('advances calendar days through leap day and ignores future reading dates', () => {
    const mine = days('2024-02-28', '2024-02-29', '2024-03-01', '2024-03-04')
    const theirs = days('2024-02-28', '2024-02-29', '2024-03-01', '2024-03-04')
    expect(coupleStreak(mine, theirs, '2024-03-02').current).toBe(3)
    expect(coupleStreak(days('2026-04-02'), days('2026-04-02'), '2026-04-01').current).toBe(0)
  })
})

describe('dailyReminderBody', () => {
  it('mentions only the couple streak when it is positive', () => {
    expect(dailyReminderBody(1, false, 'Ana')).toBe('Lleváis 1 día leyendo los dos')
    expect(dailyReminderBody(5, true, 'Ana')).toBe('Lleváis 5 días seguidos leyendo los dos')
  })

  it('mentions the partner reading today only when the couple streak is zero', () => {
    expect(dailyReminderBody(0, true, 'Ana')).toBe('Ana ya ha leído hoy')
    expect(dailyReminderBody(0, true, '  Ana  ')).toBe('Ana ya ha leído hoy')
    expect(dailyReminderBody(0, true, null)).toBe('Tu pareja ya ha leído hoy')
    expect(dailyReminderBody(0, true, '  ')).toBe('Tu pareja ya ha leído hoy')
  })

  it('stays neutral at zero when the partner has not read today', () => {
    expect(dailyReminderBody(0, false, 'Ana')).toBe('Cuando te apetezca')
    expect(dailyReminderBody(0, false)).toBe('Cuando te apetezca')
  })
})
