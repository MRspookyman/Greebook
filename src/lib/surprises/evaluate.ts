import { SURPRISES, type Surprise } from '@/config/surprises'
import type { Format, Reading } from '@/lib/types'

export interface SurpriseStats {
  booksFinished: number
  finishedFormats: Format[]
  currentStreak: number
  finishedThisYear: number
  yearlyGoal: number
}

/** Historical reads count toward the annual goal, but never unlock reading milestones. */
export function finishedSurpriseStats(
  readings: Pick<Reading, 'status' | 'backfilled' | 'format' | 'finished_on'>[],
  today: string,
): Pick<SurpriseStats, 'booksFinished' | 'finishedFormats' | 'finishedThisYear'> {
  const finished = readings.filter((reading) => reading.status === 'finished')
  const tracked = finished.filter((reading) => !reading.backfilled)
  return {
    booksFinished: tracked.length,
    finishedFormats: [...new Set(tracked.map((reading) => reading.format))],
    finishedThisYear: finished.filter((reading) => reading.finished_on?.slice(0, 4) === today.slice(0, 4)).length,
  }
}

export function surpriseSeenKey(surprise: Surprise, today: string): string {
  return surprise.trigger.type === 'date' ? `${surprise.key}:${today.slice(0, 4)}` : surprise.key
}

export function pendingSurprises(
  stats: SurpriseStats,
  today: string,
  seenKeys: Set<string>,
  surprises: Surprise[] = SURPRISES,
): Surprise[] {
  return surprises.filter((surprise) => {
    if (seenKeys.has(surpriseSeenKey(surprise, today))) return false
    const trigger = surprise.trigger
    switch (trigger.type) {
      case 'booksFinished':
        return stats.booksFinished >= trigger.count
      case 'firstFinishedFormat':
        return stats.finishedFormats.includes(trigger.format)
      case 'streak':
        return stats.currentStreak >= trigger.days
      case 'goalReached':
        return stats.finishedThisYear >= stats.yearlyGoal
      case 'date':
        return today.slice(5) === trigger.monthDay
    }
  })
}
