/* Deploy:
 * 1. Set VAPID secrets as documented in ../_shared/push.ts.
 * 2. Generate a random WEBHOOK_SECRET; `supabase secrets set WEBHOOK_SECRET=...`.
 * 3. `supabase functions deploy notify-partner --no-verify-jwt`
 *    This endpoint authenticates its callers with its own secret header.
 * 4. Triggers in migrations 0004 and 0005 POST here with {type, table, schema, record, old_record}.
 */
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { sendToUser } from '../_shared/push.ts'

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
}

const EMOJIS = ['❤️', '🔥', '📚', '😂', '😮', '👏']
/** Must match src/lib/club.ts → stopStep. */
const stopStep = (total: number) => (total >= 300 ? 100 : 50)
/** A live session older than this is treated as abandoned. */
const LIVE_MS = 3 * 60 * 60 * 1000

async function single<T>(query: PromiseLike<{ data: T | null; error: unknown }>): Promise<T | null> {
  const { data, error } = await query
  if (error) throw error
  return data
}

async function profile(admin: SupabaseClient, id: string) {
  return await single(
    admin
      .from('profiles')
      .select('id, display_name, partner_id, notify_partner, reading_now_since, last_live_notified_on')
      .eq('id', id)
      .maybeSingle(),
  )
}

async function bookTitle(admin: SupabaseClient, bookId: unknown): Promise<string | null> {
  if (typeof bookId !== 'string') return null
  const book = await single(admin.from('books').select('title').eq('id', bookId).maybeSingle())
  return (book as { title: string } | null)?.title ?? null
}

async function build(admin: SupabaseClient, payload: WebhookPayload): Promise<Push | null> {
  const record = payload.record!
  const old = payload.old_record
  const actorId = (record.user_id ?? record.from_user ?? (payload.table === 'profiles' ? record.id : null)) as unknown
  if (typeof actorId !== 'string') return null
  const actor = await profile(admin, actorId)
  if (!actor?.partner_id) return null
  const partnerId = actor.partner_id as string
  const name = actor.display_name as string

  switch (payload.table) {
    case 'readings': {
      if (payload.type !== 'UPDATE' || !old) return null
      if (old.status !== 'finished' && record.status === 'finished') {
        const title = await bookTitle(admin, record.book_id)
        if (!title) return null
        const rating = record.rating == null ? '' : ` ⭐ ${String(record.rating).replace('.', ',')}`
        return { to: partnerId, body: `${name} ha terminado «${title}»${rating}`, url: '/nosotros' }
      }
      // Club de dos: notify when this session reaches a stop the partner already passed.
      const from = Number(old.current_position)
      const to = Number(record.current_position)
      const total = Number(record.total_units)
      if (record.unit !== 'pages' || !(to > from)) return null
      const step = stopStep(total)
      const stop = Math.floor(to / step) * step
      if (stop <= from || stop <= 0 || stop >= total) return null
      const theirs = await single(
        admin
          .from('readings')
          .select('current_position, unit, status')
          .eq('user_id', partnerId)
          .eq('book_id', record.book_id as string)
          .in('status', ['reading', 'finished'])
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      )
      const partnerReading = theirs as { current_position: number; unit: string; status: string } | null
      if (!partnerReading || partnerReading.unit !== 'pages') return null
      if (partnerReading.status !== 'finished' && partnerReading.current_position < stop) return null
      const title = await bookTitle(admin, record.book_id)
      return {
        to: partnerId,
        body: `${name} ha llegado a la parada de la p. ${stop} de «${title}». Ya podéis hablar de ello.`,
        url: `/club/${record.book_id}`,
      }
    }
    case 'reactions': {
      if (payload.type !== 'INSERT' || !EMOJIS.includes(String(record.emoji))) return null
      const table = record.target_type === 'session' ? 'sessions' : record.target_type === 'reading' ? 'readings' : 'notes'
      const target = await single(admin.from(table).select('user_id').eq('id', String(record.target_id)).maybeSingle())
      if ((target as { user_id: string } | null)?.user_id !== partnerId) return null
      const what = record.target_type === 'note' ? 'a tu mensaje' : 'a tu lectura'
      return { to: partnerId, body: `${name} ha reaccionado ${record.emoji} ${what}`, url: '/nosotros' }
    }
    case 'nudges': {
      if (payload.type !== 'INSERT' || record.to_user !== partnerId) return null
      return { to: partnerId, body: `${name} te ha dado un toque: «${String(record.message)}»`, url: '/nosotros' }
    }
    case 'recommendations': {
      if (payload.type !== 'INSERT' || record.to_user !== partnerId) return null
      const title = await bookTitle(admin, record.book_id)
      if (!title) return null
      const together = record.together ? ' para leerlo juntos' : ''
      const message = record.message ? `: «${String(record.message)}»` : ''
      return { to: partnerId, body: `${name} te recomienda «${title}»${together}${message}`, url: '/' }
    }
    case 'notes': {
      if (payload.type !== 'INSERT' || !record.shared) return null
      const reading = await single(
        admin.from('readings').select('book_id').eq('id', String(record.reading_id)).maybeSingle(),
      )
      const bookId = (reading as { book_id: string } | null)?.book_id
      if (!bookId) return null
      const title = await bookTitle(admin, bookId)
      // Spoiler-safe: show the text only if the partner is past that page.
      const mine = await single(
        admin
          .from('readings')
          .select('current_position, unit, status')
          .eq('user_id', partnerId)
          .eq('book_id', bookId)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      )
      const position = mine as { current_position: number; unit: string; status: string } | null
      const page = record.page == null ? null : Number(record.page)
      const safe =
        page === null || position?.status === 'finished' || (position?.unit === 'pages' && position.current_position >= page)
      const text = String(record.body)
      const verb = record.reply_to ? 'te ha respondido' : 'ha escrito'
      return {
        to: partnerId,
        body: safe
          ? `${name} ${verb} en el club de «${title}»: «${text.length > 120 ? `${text.slice(0, 117)}…` : text}»`
          : `${name} ${verb} en el club de «${title}» (más adelante de donde vas)`,
        url: `/club/${bookId}`,
      }
    }
    case 'profiles': {
      if (payload.type !== 'UPDATE' || !record.reading_now_since || old?.reading_now_since) return null
      const today = new Date().toISOString().slice(0, 10)
      if (actor.last_live_notified_on === today) return null
      const partner = await profile(admin, partnerId)
      const partnerLive =
        partner?.reading_now_since && Date.now() - new Date(String(partner.reading_now_since)).getTime() < LIVE_MS
      if (partnerLive) return null
      const { error } = await admin.from('profiles').update({ last_live_notified_on: today }).eq('id', actorId)
      if (error) throw error
      return { to: partnerId, body: `${name} se ha puesto a leer. ¿Te unes?`, url: '/' }
    }
  }
  return null
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
  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const push = await build(admin, payload)
    if (!push) return Response.json({ sent: false })
    const recipient = await profile(admin, push.to)
    if (!recipient?.notify_partner) return Response.json({ sent: false })
    await sendToUser(admin, push.to, { title: 'Greenbook', body: push.body, url: push.url })
    return Response.json({ sent: true })
  } catch (error) {
    console.error('notify-partner failed', error)
    return Response.json({ error: 'No se pudo enviar el aviso' }, { status: 500 })
  }
})
