import { useMe } from '@/features/auth/me'
import { fetchProfile, useTogether } from '@/lib/data'
import { supabase } from '@/lib/supabase'
import type { TogetherItemWithBook } from '@/lib/types'

export async function coupleIdentity() {
  const { data, error } = await supabase.auth.getUser()
  if (error) throw error
  if (!data.user) throw new Error('Inicia sesión para continuar')
  const profile = await fetchProfile(data.user.id)
  if (!profile.partner_id) throw new Error('Aún no tienes pareja vinculada')
  return { userId: data.user.id, partnerId: profile.partner_id }
}

export type PendingItem = { type: 'together'; item: TogetherItemWithBook }

/** Proposals to read a book together that wait for you. */
export function usePendingForMe(): { items: PendingItem[]; count: number } {
  const { userId } = useMe()
  const together = useTogether().data ?? []
  const items: PendingItem[] = together
    .filter(
      (item) =>
        (!item.partner_answer && item.partner_id === userId) || (item.partner_answer === 'yes' && !item.start_on),
    )
    .map((item) => ({ type: 'together', item }))
  return { items, count: items.length }
}
