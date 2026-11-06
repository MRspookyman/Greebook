import { supabase } from '@/lib/supabase'
import { queryClient } from '@/lib/queryClient'
import { qk } from '@/lib/data'
import type { Invite } from '@/lib/types'

export function isInviteExpired(invite: Invite, now = new Date()): boolean {
  const end = new Date(invite.starts_at ?? invite.created_at)
  end.setHours(23, 59, 59, 999)
  return now.getTime() > end.getTime()
}

export function inviteLabel(invite: Invite): string {
  if (!invite.starts_at) return 'ahora'
  const date = new Date(invite.starts_at)
  const today = new Date()
  const when = date.toDateString() === today.toDateString() ? (date.getHours() >= 18 ? 'esta noche' : 'hoy') : 'mañana'
  return `${when} a las ${date.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}`
}

export async function sendInvite(startsAt: string | null): Promise<void> {
  const { data: auth } = await supabase.auth.getSession()
  const id = auth.session?.user.id
  if (!id) throw new Error('Inicia sesión para invitar')
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('partner_id')
    .eq('id', id)
    .single()
  if (profileError) throw profileError
  if (!profile.partner_id) throw new Error('Todavía no tienes pareja vinculada')
  const { data: existing, error: readError } = await supabase
    .from('invites')
    .select('*')
    .eq('from_user', id)
    .eq('status', 'pending')
  if (readError) throw readError
  if ((existing as Invite[]).some((invite) => !isInviteExpired(invite)))
    throw new Error('Ya tienes una invitación pendiente')
  const { error } = await supabase.from('invites').insert({ to_user: profile.partner_id, starts_at: startsAt })
  if (error) throw error
  await queryClient.invalidateQueries({ queryKey: qk.invites() })
}

export async function respondInvite(id: string, answer: 'accepted' | 'declined'): Promise<void> {
  const { error } = await supabase
    .from('invites')
    .update({ status: answer, responded_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'pending')
  if (error) throw error
  await queryClient.invalidateQueries({ queryKey: qk.invites() })
}

export async function cancelInvite(id: string): Promise<void> {
  const { error } = await supabase.from('invites').delete().eq('id', id)
  if (error) throw error
  await queryClient.invalidateQueries({ queryKey: qk.invites() })
}
