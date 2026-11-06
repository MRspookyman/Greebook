import { SURPRISES, type Surprise } from '@/config/surprises'

export interface SurpriseStats {
  booksFinished: number
  currentStreak: number
  finishedThisYear: number
  yearlyGoal: number
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
      case 'streak':
        return stats.currentStreak >= trigger.days
      case 'goalReached':
        return stats.finishedThisYear >= stats.yearlyGoal
      case 'date':
        return today.slice(5) === trigger.monthDay
    }
  })
}
