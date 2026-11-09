/* Deploy with --no-verify-jwt; authenticate database webhooks using WEBHOOK_SECRET.
 * notify_partner_webhook() comes from 0004/0006; migrations through 0012 select the kept triggers.
 */
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { sendToUser } from '../_shared/push.ts'
import { localDate } from '../_shared/time.ts'
import { excerpt, quoteNotification } from '../_shared/notifications.ts'

interface WebhookPayload {
  type: string
  table: string
  schema?: string
  record: Record<string, unknown> | null
  old_record: Record<string, unknown> | null
}
interface Push {
  to: string
  title: string
  body: string
  url: string
  tag?: string
  renotify?: boolean
  unlockedIds?: string[]
}
interface OpenReading {
  id: string
  unit: string
  status: string
  current_position: number
  total_units: number
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
      admin.from('readings').select('id, unit, status, current_position, total_units')
        .eq('user_id', userId).eq('book_id', bookId).in('status', ['want', 'reading']),
    )) ?? []
  )
}
// Recipient-side rule in public.quote_locked(), including non-page units.
function locked(quote: Record<string, unknown>, readings: OpenReading[], pageCount: number | null): boolean {
  if (quote.safe || quote.opened_early || quote.page == null || quote.book_id == null) return false
  const page = Number(quote.page)
  return readings.some(
    (reading) => ['want', 'reading'].includes(reading.status) &&
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
  const actorId = payload.table === 'profiles' ? record.id
    : payload.table === 'read_together' ? record.user_b
    : payload.table === 'together_items' ? record.added_by
    : record.user_id
  if (typeof actorId !== 'string') return []
  const actor = await profile(admin, actorId)
  if (!actor?.partner_id) return []
  const name = actor.display_name as string
  const partnerId = actor.partner_id as string
  switch (payload.table) {
    case 'profiles': {
      // One started-reading push per actor's local day; disabled recipients consume no slot.
      if (payload.type !== 'UPDATE' || old?.reading_now_since || !record.reading_now_since) return []
      const recipient = await profile(admin, partnerId)
      if (!recipient?.notify_partner) return []
      const today = localDate(new Date(), String(actor.timezone ?? 'Europe/Madrid'))
      if (record.live_notified_on === today) return []
      const reading = record.reading_now_id
        ? await checked(admin.from('readings').select('book_id').eq('id', String(record.reading_now_id)).maybeSingle())
        : null
      const title = reading ? await book(admin, reading.book_id) : null
      // Conditional claim also prevents concurrent webhook deliveries from consuming two slots.
      const claimed = await checked(admin.from('profiles').update({ live_notified_on: today })
        .eq('id', actorId).or(`live_notified_on.is.null,live_notified_on.neq.${today}`).select('id'))
      if (!claimed?.length) return []
      return [{ to: partnerId, title: `📖 ${name} se ha puesto a leer`,
        body: title ? `«${title.title}» · ¿Te unes?` : 'Un ratito entre páginas. ¿Te unes?', url: '/' }]
    }
    case 'read_together': {
      if (payload.type !== 'INSERT' || record.user_a !== partnerId) return []
      return [{ to: partnerId, title: `💞 ${name} se ha unido a tu lectura`,
        body: 'Ya estáis leyendo juntos', url: '/leer' }]
    }
    case 'quotes': {
      if (payload.type !== 'INSERT' || !record.shared) return []
      const title = await book(admin, record.book_id)
      if (!title) return []
      const isLocked = locked(record, await openReadings(admin, partnerId, String(record.book_id)), title.page_count)
      const { count, error } = await admin.from('quotes').select('id', { count: 'exact', head: true })
        .eq('user_id', actorId).eq('book_id', String(record.book_id)).eq('shared', true)
        .gte('created_at', new Date(Date.now() - 30 * 60_000).toISOString())
      if (error) throw error
      return [{ to: partnerId, ...quoteNotification({ name, book: title.title, kind: record.kind,
        count: count ?? 1, locked: isLocked, page: record.page, body: record.body,
        actorId, bookId: String(record.book_id) }), url: `/citas#c-${record.id}` }]
    }
    case 'quote_replies': {
      if (payload.type !== 'INSERT') return []
      const quote = await checked(admin.from('quotes').select('user_id, shared, safe, opened_early, page, book_id')
        .eq('id', String(record.quote_id)).maybeSingle())
      if (!quote || (quote.user_id !== partnerId && !(quote.user_id === actorId && quote.shared))) return []
      const title = await book(admin, quote.book_id)
      const isLocked = quote.user_id !== partnerId && locked(quote,
        await openReadings(admin, partnerId, String(quote.book_id)), title?.page_count ?? null)
      return [{ to: partnerId, title: `💬 ${name} te ha respondido`,
        body: isLocked ? 'La respuesta se abre cuando llegues.' : `«${excerpt(record.body)}»`,
        url: `/citas#c-${record.quote_id}` }]
    }
    case 'readings': {
      if (payload.type !== 'UPDATE' || !old) return []
      const pushes: Push[] = []
      const title = await book(admin, record.book_id)
      if (!title) return []
      if (old.status !== 'finished' && record.status === 'finished') {
        const rating = record.rating == null ? '' : ` · ⭐ ${String(record.rating).replace('.', ',')}`
        pushes.push({ to: partnerId, title: `📗 ${name} ha terminado un libro`,
          body: `«${title.title}»${rating}`, url: `/libro/${record.id}` })
      }
      if (Number(record.current_position) <= Number(old.current_position) || !actor.notify_partner) return pushes
      const quotes = await checked(admin.from('quotes').select('id, page, book_id, opened_early')
        .eq('user_id', partnerId).eq('shared', true).eq('safe', false).eq('book_id', String(record.book_id))
        .is('unlock_notified_at', null).eq('opened_early', false).order('created_at'))
      const others = (await openReadings(admin, actorId, String(record.book_id))).filter((reading) => reading.id !== record.id)
      const before = [...others, old as unknown as OpenReading]
      const after = [...others, record as unknown as OpenReading]
      const unlocked = (quotes ?? []).filter((quote) =>
        locked(quote, before, title.page_count) && !locked(quote, after, title.page_count))
      if (unlocked.length) {
        const partner = await profile(admin, partnerId)
        pushes.push({ to: actorId, title: `🔓 ${partner?.display_name ?? 'Tu pareja'} te dejó algo`,
          body: `Ya puedes abrir lo que te dejó en «${title.title}»`,
          url: `/citas#c-${unlocked[0].id}`, unlockedIds: unlocked.map((quote) => quote.id) })
      }
      return pushes
    }
    case 'together_items': {
      const title = await book(admin, record.book_id)
      if (!title || record.partner_id !== partnerId) return []
      if (payload.type === 'INSERT')
        return [{ to: partnerId, title: `📚 ${name} quiere leer contigo`,
          body: `«${title.title}»${record.reason ? ` · «${excerpt(record.reason)}»` : ''}`, url: '/nosotros' }]
      if (payload.type !== 'UPDATE' || !old) return []
      if (!old.start_on && record.start_on) {
        const starter = record.started_by === actorId ? name : (await profile(admin, partnerId))?.display_name ?? 'Tu pareja'
        return await Promise.all([actorId, partnerId].filter((id) => id !== record.started_by).map(async (to) => {
          const recipient = await profile(admin, to)
          const today = localDate(new Date(), recipient?.timezone ?? 'Europe/Madrid')
          const date = String(record.start_on)
          const when = date === today ? 'hoy' : `el ${new Intl.DateTimeFormat('es-ES', {
            timeZone: 'UTC', day: 'numeric', month: 'short',
          }).format(new Date(`${date}T12:00:00Z`))}`
          return { to, title: `📚 ${starter} empieza contigo`, body: `Empezáis «${title.title}» ${when}`, url: '/nosotros' }
        }))
      }
      if (old.partner_answer !== 'yes' && record.partner_answer === 'yes') {
        const partner = await profile(admin, partnerId)
        return [{ to: actorId, title: `📚 A ${partner?.display_name ?? 'tu pareja'} también le apetece`,
          body: `«${title.title}» · ¿Empezáis?`, url: '/nosotros' }]
      }
      return []
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
  if (!['profiles', 'read_together', 'quotes', 'quote_replies', 'readings', 'together_items'].includes(payload.table))
    return Response.json({ sent: false })
  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    let sent = false
    for (const push of await build(admin, payload)) {
      const recipient = await profile(admin, push.to)
      if (!recipient?.notify_partner) continue
      const { to, unlockedIds, ...notification } = push
      const devices = await sendToUser(admin, to, notification)
      sent ||= devices > 0
      if (unlockedIds) {
        const { error } = await admin.from('quotes').update({ unlock_notified_at: new Date().toISOString() })
          .in('id', unlockedIds)
        if (error) throw error
      }
    }
    return Response.json({ sent })
  } catch (error) {
    console.error('notify-partner failed', error)
    return Response.json({ error: 'No se pudo enviar el aviso' }, { status: 500 })
  }
})
