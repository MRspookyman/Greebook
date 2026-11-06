import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from './supabase'
import type { Note, Profile, Reaction, ReadingWithBook, Session } from './types'

/**
 * Shared query keys. All feature code MUST use these so that optimistic updates,
 * realtime invalidation and the offline queue touch the same cache entries.
 */
export const qk = {
  profile: (userId: string) => ['profile', userId] as const,
  /** Every reading of a user, joined with its book. */
  readings: (userId: string) => ['readings', userId] as const,
  /** Every session of a user. */
  sessions: (userId: string) => ['sessions', userId] as const,
  /** Notes visible to me for one reading (own, or partner's shared ones). */
  notes: (readingId: string) => ['notes', readingId] as const,
  /** Every reaction visible to me (mine + partner's). */
  reactions: () => ['reactions'] as const,
}

const PAGE = 1000

/** Supabase caps responses at 1000 rows; page through everything. */
async function fetchAll<T>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  const out: T[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await build(from, from + PAGE - 1)
    if (error) throw error
    out.push(...(data ?? []))
    if (!data || data.length < PAGE) return out
  }
}

export async function fetchProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
  if (error) throw error
  return data as Profile
}

export function useProfile(userId: string | null | undefined) {
  return useQuery({
    queryKey: qk.profile(userId ?? ''),
    queryFn: () => fetchProfile(userId!),
    enabled: !!userId,
  })
}

/** Updates own profile fields and refreshes the cached profile (which re-renders `useMe`). */
export function useUpdateProfile(userId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (patch: Partial<Omit<Profile, 'id' | 'partner_id' | 'is_gift_recipient'>>) => {
      const { data, error } = await supabase.from('profiles').update(patch).eq('id', userId).select().single()
      if (error) throw error
      return data as Profile
    },
    onSuccess: (profile) => qc.setQueryData(qk.profile(userId), profile),
  })
}

export function useReadings(userId: string | null | undefined) {
  return useQuery({
    queryKey: qk.readings(userId ?? ''),
    enabled: !!userId,
    queryFn: () =>
      fetchAll<ReadingWithBook>((from, to) =>
        supabase
          .from('readings')
          .select('*, book:books(*)')
          .eq('user_id', userId!)
          .order('updated_at', { ascending: false })
          .range(from, to),
      ),
  })
}

export function useSessions(userId: string | null | undefined) {
  return useQuery({
    queryKey: qk.sessions(userId ?? ''),
    enabled: !!userId,
    queryFn: () =>
      fetchAll<Session>((from, to) =>
        supabase
          .from('sessions')
          .select('*')
          .eq('user_id', userId!)
          .order('read_on', { ascending: false })
          .order('created_at', { ascending: false })
          .range(from, to),
      ),
  })
}

export function useNotes(readingId: string | null | undefined) {
  return useQuery({
    queryKey: qk.notes(readingId ?? ''),
    enabled: !!readingId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('reading_id', readingId!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Note[]
    },
  })
}

export function useReactions() {
  return useQuery({
    queryKey: qk.reactions(),
    queryFn: () =>
      fetchAll<Reaction>((from, to) =>
        supabase.from('reactions').select('*').order('created_at', { ascending: false }).range(from, to),
      ),
  })
}
