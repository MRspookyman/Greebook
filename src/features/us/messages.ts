import { useEffect, useState } from 'react'
import { useMe } from '@/features/auth/me'
import { fetchProfile, useCoupleGoal, useInvites, useTogether } from '@/lib/data'
import { supabase } from '@/lib/supabase'
import type { CoupleGoal, Invite, TogetherItemWithBook } from '@/lib/types'
import { todayISO } from '@/lib/dates'
import { isInviteExpired } from './ratito'

export async function coupleIdentity() {
  const { data, error } = await supabase.auth.getUser()
  if (error) throw error
  if (!data.user) throw new Error('Inicia sesión para continuar')
  const profile = await fetchProfile(data.user.id)
  if (!profile.partner_id) throw new Error('Aún no tienes pareja vinculada')
  return { userId: data.user.id, partnerId: profile.partner_id }
}

export type PendingItem =
  | { type: 'invite'; invite: Invite }
  | { type: 'together'; item: TogetherItemWithBook }
  | { type: 'goal'; goal: CoupleGoal }

export function usePendingForMe(): { items: PendingItem[]; count: number } {
  const { userId } = useMe()
  const invites = useInvites().data ?? []
  const together = useTogether().data ?? []
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(timer)
  }, [])
  const goal = useCoupleGoal(todayISO().slice(0, 7)).data
  const items: PendingItem[] = []
  for (const invite of invites) {
    if (invite.to_user === userId && invite.status === 'pending' && !isInviteExpired(invite, now)) {
      items.push({ type: 'invite', invite })
    }
  }
  for (const item of together) {
    if ((!item.partner_answer && item.partner_id === userId) || (item.partner_answer === 'yes' && !item.start_on)) {
      items.push({ type: 'together', item })
    }
  }
  if (goal && goal.proposed_by !== userId && !goal.accepted_at) items.push({ type: 'goal', goal })
  return { items, count: items.length }
}
