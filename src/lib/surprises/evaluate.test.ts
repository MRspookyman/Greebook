import { describe, expect, it } from 'vitest'
import type { Surprise } from '@/config/surprises'
import { pendingSurprises } from './evaluate'

const stats = { booksFinished: 5, currentStreak: 7, finishedThisYear: 5, yearlyGoal: 5 }
const books: Surprise = { key: 'five', trigger: { type: 'booksFinished', count: 5 }, title: '', message: '' }
const date: Surprise = { key: 'valentine', trigger: { type: 'date', monthDay: '02-14' }, title: '', message: '' }

describe('pendingSurprises', () => {
  it('returns an unseen five-book milestone at five finished books', () => {
    expect(pendingSurprises(stats, '2027-02-14', new Set(), [books])).toEqual([books])
  })
  it('does not repeat a seen milestone', () => {
    expect(pendingSurprises(stats, '2027-02-14', new Set(['five']), [books])).toEqual([])
  })
  it('repeats an annual date in a new year, but not in the same year', () => {
    expect(pendingSurprises(stats, '2027-02-14', new Set(['valentine:2026']), [date])).toEqual([date])
    expect(pendingSurprises(stats, '2027-02-14', new Set(['valentine:2027']), [date])).toEqual([])
    expect(pendingSurprises(stats, '2027-02-15', new Set(), [date])).toEqual([])
  })
  it('requires milestone thresholds and preserves configured order', () => {
    const streak: Surprise = { key: 'week', trigger: { type: 'streak', days: 7 }, title: '', message: '' }
    const goal: Surprise = { key: 'goal', trigger: { type: 'goalReached' }, title: '', message: '' }
    expect(pendingSurprises(stats, '2027-01-02', new Set(), [goal, books, streak])).toEqual([goal, books, streak])
    expect(
      pendingSurprises({ ...stats, booksFinished: 4, currentStreak: 6, finishedThisYear: 4 }, '2027-01-02', new Set(), [
        goal,
        books,
        streak,
      ]),
    ).toEqual([])
  })
})
