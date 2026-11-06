import { qk } from '@/lib/data'
import { queryClient } from '@/lib/queryClient'
import { supabase } from '@/lib/supabase'
import type { CoupleGoal } from '@/lib/types'
import { coupleIdentity } from './messages'

export async function proposeGoal(month: string, kind: CoupleGoal['kind'], target: number): Promise<void> {
  const { userId, partnerId } = await coupleIdentity()
  const [user_a, user_b] = [userId, partnerId].sort()
  const { error } = await supabase.from('couple_goals').insert({ user_a, user_b, month, kind, target })
  if (error) throw error
  await queryClient.invalidateQueries({ queryKey: qk.coupleGoal(month) })
}

export async function answerGoal(goal: CoupleGoal, accept: boolean): Promise<void> {
  const { userId } = await coupleIdentity()
  if (goal.proposed_by === userId) throw new Error('La propuesta la acepta tu pareja')
  const query = accept
    ? supabase.from('couple_goals').update({ accepted_at: new Date().toISOString() })
    : supabase.from('couple_goals').delete()
  const { error } = await query
    .eq('user_a', goal.user_a)
    .eq('user_b', goal.user_b)
    .eq('month', goal.month)
    .is('accepted_at', null)
  if (error) throw error
  await queryClient.invalidateQueries({ queryKey: qk.coupleGoal(goal.month) })
}
