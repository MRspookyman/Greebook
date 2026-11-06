import { qk } from '@/lib/data'
import { todayISO } from '@/lib/dates'
import { queryClient } from '@/lib/queryClient'
import { supabase } from '@/lib/supabase'
import { coupleIdentity } from './messages'

export async function addTogether(bookId: string, reason?: string | null): Promise<void> {
  const { partnerId } = await coupleIdentity()
  const { error } = await supabase.from('together_items').insert({
    book_id: bookId,
    partner_id: partnerId,
    reason: reason?.trim() || null,
  })
  if (error) throw error
  await queryClient.invalidateQueries({ queryKey: qk.together() })
}

export async function answerTogether(id: string, answer: 'yes' | 'later'): Promise<void> {
  const { userId } = await coupleIdentity()
  const { error } = await supabase
    .from('together_items')
    .update({ partner_answer: answer })
    .eq('id', id)
    .eq('partner_id', userId)
  if (error) throw error
  await queryClient.invalidateQueries({ queryKey: qk.together() })
}

export async function startTogether(id: string, startDate: string): Promise<void> {
  const { userId, partnerId } = await coupleIdentity()
  const { error } = await supabase.rpc('start_together', { item_id: id, start_date: startDate, today: todayISO() })
  if (error) throw error
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: qk.together() }),
    queryClient.invalidateQueries({ queryKey: qk.readings(userId) }),
    queryClient.invalidateQueries({ queryKey: qk.readings(partnerId) }),
    queryClient.invalidateQueries({ queryKey: qk.messages() }),
  ])
}
