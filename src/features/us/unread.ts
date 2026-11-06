import { useMe } from '@/features/auth/me'
import { useNudges, useReactions, useRecommendations, useSessions, useSharedNotes } from '@/lib/data'

/** Things my partner did after I last opened Nosotros (badge on the tab). */
export function useUsUnread(): number {
  const { userId, profile, partner } = useMe()
  const enabled = !!partner
  const sessions = useSessions(partner?.id)
  const notes = useSharedNotes(enabled)
  const reactions = useReactions()
  const nudges = useNudges(enabled)
  const recs = useRecommendations(enabled)
  if (!partner) return 0
  // First visit ever: count only the last day so the badge does not start huge.
  const since = profile.last_seen_us_at ?? new Date(Date.now() - 86400000).toISOString()
  const after = (date: string) => date > since
  return (
    (sessions.data ?? []).filter((s) => after(s.created_at)).length +
    (notes.data ?? []).filter((n) => n.user_id === partner.id && after(n.created_at)).length +
    (reactions.data ?? []).filter((r) => r.user_id === partner.id && after(r.created_at)).length +
    (nudges.data ?? []).filter((n) => n.to_user === userId && after(n.created_at)).length +
    (recs.data ?? []).filter((r) => r.to_user === userId && after(r.created_at)).length
  )
}
