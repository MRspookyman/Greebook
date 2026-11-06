/* Deploy with --no-verify-jwt; authenticate database webhooks using WEBHOOK_SECRET.
 * Migrations 0004/0006 define notify_partner_webhook(), and 0007 installs the Rincón triggers.
 */
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { sendToUser } from '../_shared/push.ts'
import { localDate } from '../_shared/time.ts'

interface WebhookPayload {
  type: string
  table: string
  schema?: string
  record: Record<string, unknown> | null
  old_record: Record<string, unknown> | null
}
interface Push {
  to: string
  body: string
  url: string
  unlockedIds?: string[]
}
interface OpenReading {
  id: string
  unit: string
  status: string
  current_position: number
  total_units: number
}
const emotions: Record<string, string> = { love: '😍', twist: '😮', laugh: '😂', moved: '😢', thinking: '🤔' }
const excerpt = (text: unknown) => {
  const value = String(text ?? '').trim()
  return value.length > 80 ? `${value.slice(0, 79)}…` : value
}
async function checked<T>(query: PromiseLike<{ data: T; error: unknown }>): Promise<T> {
  const { data, error } = await query
  if (error) throw error
  return data
}
async function profile(admin: SupabaseClient, id: string) {
  return await checked(
    admin.from('profiles').select('id, display_name, partner_id, notify_partner, timezone').eq('id', id).maybeSingle(),
  )
}
async function book(admin: SupabaseClient, id: unknown) {
  if (typeof id !== 'string') return null
  return await checked(admin.from('books').select('title, page_count').eq('id', id).maybeSingle())
}
async function openReadings(admin: SupabaseClient, userId: string, bookId: string): Promise<OpenReading[]> {
  return (
    (await checked(
      admin
        .from('readings')
        .select('id, unit, status, current_position, total_units')
        .eq('user_id', userId)
        .eq('book_id', bookId)
        .in('status', ['want', 'reading']),
    )) ?? []
  )
}
// Exactly the recipient-side rule in public.message_locked(), including non-page units.
function locked(message: Record<string, unknown>, readings: OpenReading[], pageCount: number | null): boolean {
  if (message.opened_early || message.page == null || message.book_id == null) return false
  const page = Number(message.page)
  return readings.some(
    (reading) =>
      ['want', 'reading'].includes(reading.status) &&
      (reading.unit === 'pages'
        ? reading.current_position < page
        : pageCount && pageCount > 0
          ? reading.current_position / reading.total_units < page / pageCount
          : true),
  )
}
async function build(admin: SupabaseClient, payload: WebhookPayload): Promise<Push[]> {
  const record = payload.record!
  const old = payload.old_record
  const actorId =
    payload.table === 'readings'
      ? record.user_id
      : payload.table === 'together_items'
        ? record.added_by
        : payload.table === 'couple_goals'
          ? record.proposed_by
          : record.from_user
  if (typeof actorId !== 'string') return []
  const actor = await profile(admin, actorId)
  if (!actor?.partner_id) return []
  const name = actor.display_name as string
  const partnerId = actor.partner_id as string
  switch (payload.table) {
    case 'messages': {
      if (payload.type !== 'INSERT' || record.to_user !== partnerId) return []
      const title = await book(admin, record.book_id)
      const isLocked = locked(
        record,
        record.book_id ? await openReadings(admin, partnerId, String(record.book_id)) : [],
        title?.page_count ?? null,
      )
      const text = !isLocked && record.body ? `: «${excerpt(record.body)}»` : ''
      let body: string
      if (record.kind === 'trace') {
        const emoji = !isLocked ? emotions[String(record.emotion)] : ''
        body = `${name} te ha dejado algo${emoji ? ` ${emoji}` : ''} en «${title?.title ?? 'vuestro libro'}»${text}`
      } else if (record.kind === 'room')
        body = `${name} ha escrito en la sala de «${title?.title ?? 'vuestro libro'}»${text}`
      else if (record.kind === 'reply') body = `${name} te ha respondido${text}`
      else return []
      return [
        { to: partnerId, body, url: record.kind === 'room' ? `/sala/${record.book_id}` : `/nosotros#m-${record.id}` },
      ]
    }
    case 'readings': {
      if (payload.type !== 'UPDATE' || !old) return []
      const pushes: Push[] = []
      const title = await book(admin, record.book_id)
      if (!title) return []
      if (old.status !== 'finished' && record.status === 'finished') {
        const rating = record.rating == null ? '' : ` ⭐ ${String(record.rating).replace('.', ',')}`
        pushes.push({ to: partnerId, body: `${name} ha terminado «${title.title}»${rating}`, url: '/nosotros' })
      }
      if (Number(record.current_position) <= Number(old.current_position)) return pushes
      const messages = await checked(
        admin
          .from('messages')
          .select('id, page, book_id, opened_early')
          .eq('to_user', actorId)
          .eq('from_user', partnerId)
          .eq('book_id', String(record.book_id))
          .is('unlock_notified_at', null)
          .eq('opened_early', false)
          .order('created_at'),
      )
      const others = (await openReadings(admin, actorId, String(record.book_id))).filter(
        (reading) => reading.id !== record.id,
      )
      const before = [...others, old as unknown as OpenReading]
      const after = [...others, record as unknown as OpenReading]
      const unlocked = (messages ?? []).filter(
        (message) => locked(message, before, title.page_count) && !locked(message, after, title.page_count),
      )
      if (unlocked.length) {
        const partner = await profile(admin, partnerId)
        pushes.push({
          to: actorId,
          body: `Ya puedes abrir lo que te dejó ${partner?.display_name ?? 'tu pareja'} en «${title.title}»`,
          url: `/nosotros#m-${unlocked[0].id}`,
          unlockedIds: unlocked.map((message) => message.id),
        })
      }
      return pushes
    }
    case 'invites': {
      if (record.to_user !== partnerId) return []
      if (payload.type === 'INSERT') {
        const recipient = await profile(admin, partnerId)
        const time =
          record.starts_at == null
            ? ' ahora'
            : ` a las ${new Intl.DateTimeFormat('es-ES', {
                timeZone: recipient?.timezone ?? 'Europe/Madrid',
                hour: '2-digit',
                minute: '2-digit',
                hourCycle: 'h23',
              }).format(new Date(String(record.starts_at)))}`
        return [{ to: partnerId, body: `☕ ${name} te invita a un ratito de lectura${time}`, url: '/nosotros' }]
      }
      if (payload.type === 'UPDATE' && old?.status !== 'accepted' && record.status === 'accepted') {
        const recipient = await profile(admin, partnerId)
        return [
          { to: actorId, body: `${recipient?.display_name ?? 'Tu pareja'} se apunta al ratito`, url: '/nosotros' },
        ]
      }
      return []
    }
    case 'together_items': {
      const title = await book(admin, record.book_id)
      if (!title || record.partner_id !== partnerId) return []
      if (payload.type === 'INSERT')
        return [
          {
            to: partnerId,
            body: `${name} quiere leer contigo «${title.title}»${record.reason ? `: «${excerpt(record.reason)}»` : ''}`,
            url: '/nosotros',
          },
        ]
      if (payload.type !== 'UPDATE' || !old) return []
      if (!old.start_on && record.start_on) {
        const recipients = [actorId, partnerId].filter((id) => id !== record.started_by)
        return await Promise.all(
          recipients.map(async (to) => {
            const recipient = await profile(admin, to)
            const today = localDate(new Date(), recipient?.timezone ?? 'Europe/Madrid')
            const date = String(record.start_on)
            const when =
              date === today
                ? 'hoy'
                : `el ${new Intl.DateTimeFormat('es-ES', {
                    timeZone: 'UTC',
                    day: 'numeric',
                    month: 'short',
                  }).format(new Date(`${date}T12:00:00Z`))}`
            return { to, body: `Empezáis «${title.title}» ${when}`, url: '/nosotros' }
          }),
        )
      }
      if (old.partner_answer !== 'yes' && record.partner_answer === 'yes') {
        const partner = await profile(admin, partnerId)
        return [
          {
            to: actorId,
            body: `¡A ${partner?.display_name ?? 'tu pareja'} también le apetece «${title.title}»! ¿Empezáis?`,
            url: '/nosotros',
          },
        ]
      }
      return []
    }
    case 'couple_goals': {
      if (payload.type !== 'INSERT') return []
      const target = Number(record.target)
      const what =
        record.kind === 'ratitos'
          ? `${target} ${target === 1 ? 'ratito' : 'ratitos'}`
          : `${target} ${target === 1 ? 'día' : 'días'} leyendo los dos`
      return [{ to: partnerId, body: `${name} propone un reto: ${what} este mes`, url: '/nosotros' }]
    }
    default:
      return []
  }
}

Deno.serve(async (request: Request) => {
  const secret = Deno.env.get('WEBHOOK_SECRET')
  if (!secret || request.headers.get('x-webhook-secret') !== secret)
    return new Response('Unauthorized', { status: 401 })
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 })
  let payload: WebhookPayload
  try {
    payload = await request.json()
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }
  if (!payload?.record || (payload.schema && payload.schema !== 'public'))
    return new Response('Invalid payload', { status: 400 })
  if (!['messages', 'readings', 'invites', 'together_items', 'couple_goals'].includes(payload.table))
    return Response.json({ sent: false })
  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    let sent = false
    for (const push of await build(admin, payload)) {
      const recipient = await profile(admin, push.to)
      if (recipient?.notify_partner) {
        const devices = await sendToUser(admin, push.to, { title: 'Greenbook', body: push.body, url: push.url })
        sent ||= devices > 0
      }
      if (push.unlockedIds) {
        const { error } = await admin
          .from('messages')
          .update({ unlock_notified_at: new Date().toISOString() })
          .in('id', push.unlockedIds)
        if (error) throw error
      }
    }
    return Response.json({ sent })
  } catch (error) {
    console.error('notify-partner failed', error)
    return Response.json({ error: 'No se pudo enviar el aviso' }, { status: 500 })
  }
})
