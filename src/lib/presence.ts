import { queryClient } from './queryClient'
import { qk } from './data'
import { supabase } from './supabase'
import type { Profile } from './types'

/**
 * «Leyendo ahora»: mirrors the running timer on my profile so my partner sees it (and gets
 * one push per night). Best effort: offline it simply doesn't show.
 */
export async function setReadingNow(readingId: string | null): Promise<void> {
  try {
    const { data } = await supabase.auth.getSession()
    const userId = data.session?.user.id
    if (!userId) return
    const values = { reading_now_id: readingId, reading_now_since: readingId ? new Date().toISOString() : null }
    queryClient.setQueryData<Profile>(qk.profile(userId), (old) => (old ? { ...old, ...values } : old))
    const { error } = await supabase.from('profiles').update(values).eq('id', userId)
    if (error) throw error
  } catch {
    /* Presence is optional. */
  }
}
