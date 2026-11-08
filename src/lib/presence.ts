import { queryClient } from './queryClient'
import { qk } from './data'
import { supabase } from './supabase'
import type { Profile } from './types'

/**
 * «Leyendo ahora»: mirrors the running timer for soft presence only, without notifications.
 * Best effort: offline it simply doesn't show.
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

/** After this long a «leyendo ahora» left behind (app closed mid-session) no longer counts. */
const LIVE_MS = 2 * 60 * 60 * 1000

/** Whether this person's timer is running right now, from their profile's soft presence. */
export function isPartnerReading(
  person: Pick<Profile, 'reading_now_id' | 'reading_now_since'> | null | undefined,
  now = Date.now(),
): boolean {
  if (!person?.reading_now_id || !person.reading_now_since) return false
  const elapsed = now - new Date(person.reading_now_since).getTime()
  // A few minutes of clock difference between both phones is tolerated.
  return elapsed > -5 * 60 * 1000 && elapsed < LIVE_MS
}
