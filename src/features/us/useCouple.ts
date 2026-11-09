import { useMe } from '@/features/auth/me'
import { useQuoteReplies, useQuotes, useReactions, useReadings, useReadTogether, useSessions } from '@/lib/data'
import { todayISO } from '@/lib/dates'
import { coupleStreak, currentStreak } from '@/lib/stats/streak'
import { togetherMinutes } from './together-stats'

/** Everything the two of you share, gathered once for Nosotros and the streak screen. */
export function useCouple() {
  const { userId, partner } = useMe()
  const mineReadings = useReadings(userId)
  const theirReadings = useReadings(partner?.id)
  const mineSessions = useSessions(userId)
  const theirSessions = useSessions(partner?.id)
  const rows = useReadTogether(!!partner)
  const quotes = useQuotes(!!partner)
  const reactions = useReactions()
  const replies = useQuoteReplies(!!partner)
  const today = todayISO()
  const sessions = [...(mineSessions.data ?? []), ...(theirSessions.data ?? [])]
  const mineDates = new Set((mineSessions.data ?? []).map((s) => s.read_on))
  const theirDates = new Set((theirSessions.data ?? []).map((s) => s.read_on))
  const minutes = togetherMinutes(rows.data ?? [], sessions)
  return {
    today,
    loading:
      mineReadings.isPending ||
      mineSessions.isPending ||
      (!!partner && (theirReadings.isPending || theirSessions.isPending)),
    mineReadings: mineReadings.data ?? [],
    theirReadings: theirReadings.data ?? [],
    sessions,
    mineDates,
    theirDates,
    streak: coupleStreak(mineDates, theirDates, today),
    myStreak: currentStreak(mineDates, today),
    theirStreak: currentStreak(theirDates, today),
    rows: rows.data ?? [],
    minutes,
    quotes: quotes.data ?? [],
    reactions: reactions.data ?? [],
    replies: replies.data ?? [],
  }
}
