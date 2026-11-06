import { useEffect, useState } from 'react'
import { useMe } from '@/features/auth/me'
import { fetchProfile, qk, useCoupleGoal, useInvites, useMessages, useTogether } from '@/lib/data'
import { queryClient } from '@/lib/queryClient'
import { supabase } from '@/lib/supabase'
import type { CoupleGoal, Emotion, Invite, Message, MessageKind, Reaction, TogetherItemWithBook } from '@/lib/types'
import { todayISO } from '@/lib/dates'
import { isInviteExpired } from './ratito'

export const EMOTIONS: Record<Emotion, { emoji: string; label: string }> = {
  love: { emoji: '😍', label: 'me encanta' },
  twist: { emoji: '😮', label: 'menudo giro' },
  laugh: { emoji: '😂', label: 'me he reído' },
  moved: { emoji: '😢', label: 'me ha tocado' },
  thinking: { emoji: '🤔', label: 'pienso en ti' },
}

export async function coupleIdentity() {
  const { data, error } = await supabase.auth.getUser()
  if (error) throw error
  if (!data.user) throw new Error('Inicia sesión para continuar')
  const profile = await fetchProfile(data.user.id)
  if (!profile.partner_id) throw new Error('Aún no tienes pareja vinculada')
  return { userId: data.user.id, partnerId: profile.partner_id }
}

export async function sendMessage(input: {
  kind: MessageKind
  bookId?: string | null
  page?: number | null
  emotion?: Emotion | null
  body?: string | null
  replyTo?: string | null
}): Promise<void> {
  const { partnerId } = await coupleIdentity()
  const { error } = await supabase.from('messages').insert({
    to_user: partnerId,
    kind: input.kind,
    book_id: input.bookId ?? null,
    page: input.page ?? null,
    emotion: input.emotion ?? null,
    body: input.body?.trim() || null,
    reply_to: input.replyTo ?? null,
  })
  if (error) throw error
  await queryClient.invalidateQueries({ queryKey: qk.messages() })
  if (input.replyTo) await markRead([input.replyTo])
}

export async function markRead(ids: string[]): Promise<void> {
  if (!ids.length) return
  const { error } = await supabase.rpc('mark_messages_read', { ids })
  if (error) throw error
  queryClient.setQueryData<Message[]>(qk.messages(), (messages) =>
    messages?.map((message) =>
      ids.includes(message.id) && !message.locked ? { ...message, read_at: new Date().toISOString() } : message,
    ),
  )
  await queryClient.invalidateQueries({ queryKey: qk.messages() })
}

export async function openEarly(id: string): Promise<void> {
  const { error } = await supabase.rpc('open_message_early', { message_id: id })
  if (error) throw error
  await queryClient.invalidateQueries({ queryKey: qk.messages() })
}

export async function toggleHeart(messageId: string): Promise<void> {
  const { userId } = await coupleIdentity()
  await queryClient.cancelQueries({ queryKey: qk.reactions() })
  const before = queryClient.getQueryData<Reaction[]>(qk.reactions()) ?? []
  const existing = before.find((r) => r.user_id === userId && r.target_id === messageId)
  const reaction: Reaction = {
    id: crypto.randomUUID(),
    user_id: userId,
    target_type: 'message',
    target_id: messageId,
    emoji: '❤️',
    created_at: new Date().toISOString(),
  }
  queryClient.setQueryData(
    qk.reactions(),
    existing ? before.filter((r) => r.id !== existing.id) : [...before, reaction],
  )
  try {
    const { error } = existing
      ? await supabase.from('reactions').delete().eq('id', existing.id)
      : await supabase.from('reactions').insert(reaction)
    if (error) throw error
  } catch (error) {
    queryClient.setQueryData<Reaction[]>(qk.reactions(), (current) => {
      const others = (current ?? []).filter((r) => !(r.user_id === userId && r.target_id === messageId))
      return existing ? [...others, existing] : others
    })
    throw error
  } finally {
    void queryClient.invalidateQueries({ queryKey: qk.reactions() })
  }
  await markRead([messageId])
}

export type PendingItem =
  | { type: 'message'; message: Message }
  | { type: 'invite'; invite: Invite }
  | { type: 'together'; item: TogetherItemWithBook }
  | { type: 'goal'; goal: CoupleGoal }

export function usePendingForMe(): { items: PendingItem[]; count: number } {
  const { userId, partner } = useMe()
  const messages = useMessages().data ?? []
  const invites = useInvites().data ?? []
  const together = useTogether().data ?? []
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(timer)
  }, [])
  const goal = useCoupleGoal(todayISO().slice(0, 7)).data
  const items: PendingItem[] = []
  for (const message of messages) {
    if (message.to_user === userId && message.from_user === partner?.id && !message.read_at) {
      items.push({ type: 'message', message })
    }
  }
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
