import { describe, expect, it } from 'vitest'
import type { Surprise } from '@/config/surprises'
import type { Reading } from '@/lib/types'
import { finishedSurpriseStats, pendingSurprises } from './evaluate'

const stats = { booksFinished: 5, finishedFormats: [], currentStreak: 7, finishedThisYear: 5, yearlyGoal: 5 }
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
  it('unlocks the first Kindle finish only for a non-backfilled finished reading', () => {
    const kindle: Surprise = { key: 'primer-kindle', trigger: { type: 'firstFinishedFormat', format: 'ebook' }, title: '', message: '' }
    const reading: Pick<Reading, 'status' | 'format' | 'backfilled' | 'finished_on'> = {
      status: 'finished', format: 'ebook', backfilled: false, finished_on: '2027-02-01',
    }
    const evaluate = (readings: typeof reading[]) => pendingSurprises(
      { ...stats, ...finishedSurpriseStats(readings, '2027-02-14') }, '2027-02-14', new Set(), [kindle],
    )
    expect(evaluate([reading])).toEqual([kindle])
    expect(evaluate([{ ...reading, backfilled: true }])).toEqual([])
    expect(evaluate([{ ...reading, status: 'reading' }])).toEqual([])
    expect(evaluate([{ ...reading, format: 'paper' }])).toEqual([])
    expect(evaluate([])).toEqual([])
  })
  it('counts historical finishes for the yearly goal but excludes them from milestones', () => {
    const reading: Pick<Reading, 'status' | 'format' | 'backfilled' | 'finished_on'> = {
      status: 'finished', format: 'ebook', backfilled: true, finished_on: '2027-01-01',
    }
    const goal: Surprise = { key: 'goal', trigger: { type: 'goalReached' }, title: '', message: '' }
    const milestone: Surprise = { ...books, trigger: { type: 'booksFinished', count: 1 } }
    const finishedStats = finishedSurpriseStats([reading, { ...reading, finished_on: '2026-01-01' }], '2027-02-14')
    expect(finishedStats).toEqual({ booksFinished: 0, finishedFormats: [], finishedThisYear: 1 })
    expect(pendingSurprises({ ...stats, ...finishedStats, yearlyGoal: 1 }, '2027-02-14', new Set(), [milestone, goal])).toEqual([goal])
  })
})
