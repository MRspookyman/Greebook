import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from './supabase'
import type {
  CoupleGoal,
  Invite,
  Message,
  Note,
  Profile,
  Reaction,
  ReadingWithBook,
  Session,
  TogetherItemWithBook,
} from './types'

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
  /** My private notes for one reading. */
  notes: (readingId: string) => ['notes', readingId] as const,
  /** Every ❤️ visible to me (mine + partner's). */
  reactions: () => ['reactions'] as const,
  /** Every couple message (huellas, sala, respuestas) via `messages_visible`. */
  messages: () => ['messages'] as const,
  /** Ratito invitations sent or received. */
  invites: () => ['invites'] as const,
  /** «Queremos leer juntos» list. */
  together: () => ['together'] as const,
  /** Cooperative goal for a month ('yyyy-MM'). */
  coupleGoal: (month: string) => ['couple-goal', month] as const,
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

/** Every private note and quote of the user, newest first (the diary). */
export function useAllNotes(userId: string | null | undefined) {
  return useQuery({
    queryKey: ['notes', 'all', userId ?? ''] as const,
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', userId!)
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

/** All couple messages, oldest first. Locked ones come without body/emotion. */
export function useMessages(enabled = true) {
  return useQuery({
    queryKey: qk.messages(),
    enabled,
    queryFn: () =>
      fetchAll<Message>((from, to) =>
        supabase.from('messages_visible').select('*').order('created_at', { ascending: true }).range(from, to),
      ),
  })
}

export function useInvites(enabled = true) {
  return useQuery({
    queryKey: qk.invites(),
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invites')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200)
      if (error) throw error
      return data as Invite[]
    },
  })
}

export function useTogether(enabled = true) {
  return useQuery({
    queryKey: qk.together(),
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('together_items')
        .select('*, book:books(*)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as TogetherItemWithBook[]
    },
  })
}

export function useCoupleGoal(month: string, enabled = true) {
  return useQuery({
    queryKey: qk.coupleGoal(month),
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.from('couple_goals').select('*').eq('month', month).maybeSingle()
      if (error) throw error
      return data as CoupleGoal | null
    },
  })
}
