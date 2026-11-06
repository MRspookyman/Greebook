/* Deploy:
 * 1. Set VAPID secrets as documented in ../_shared/push.ts.
 * 2. Generate a random WEBHOOK_SECRET; `supabase secrets set WEBHOOK_SECRET=...`.
 * 3. `supabase functions deploy notify-partner --no-verify-jwt`
 *    This endpoint authenticates Database Webhooks with its own secret header.
 * 4. Dashboard → Database → Webhooks: create readings UPDATE and reactions INSERT
 *    webhooks, both POST https://<project-ref>.supabase.co/functions/v1/notify-partner.
 *    Headers: Content-Type: application/json; x-webhook-secret: <WEBHOOK_SECRET>.
 */
import { createClient } from 'npm:@supabase/supabase-js@2'
import { sendToUser } from '../_shared/push.ts'

interface WebhookPayload {
  type: string
  table: string
  schema?: string
  record: Record<string, unknown> | null
  old_record: Record<string, unknown> | null
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
  if (
    !payload ||
    !payload.record ||
    typeof payload.record.user_id !== 'string' ||
    (payload.schema && payload.schema !== 'public')
  )
    return new Response('Invalid payload', { status: 400 })
  const record = payload.record
  const finished =
    payload.table === 'readings' &&
    payload.type === 'UPDATE' &&
    payload.old_record &&
    payload.old_record.status !== 'finished' &&
    record.status === 'finished'
  const reacted = payload.table === 'reactions' && payload.type === 'INSERT'
  if (!finished && !reacted) return Response.json({ sent: false })
  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data: actor, error: actorError } = await admin
      .from('profiles')
      .select('display_name, partner_id')
      .eq('id', record.user_id)
      .single()
    if (actorError) throw actorError
    if (!actor.partner_id) return Response.json({ sent: false })
    let ownerId: string = actor.partner_id
    let body: string
    if (finished) {
      if (typeof record.book_id !== 'string') return new Response('Invalid book', { status: 400 })
      const { data: book, error } = await admin.from('books').select('title').eq('id', record.book_id).single()
      if (error) throw error
      const rating = record.rating == null ? '' : ` ⭐ ${String(record.rating).replace('.', ',')}`
      body = `${actor.display_name} ha terminado «${book.title}»${rating}`
    } else {
      if (
        !['session', 'reading'].includes(String(record.target_type)) ||
        typeof record.target_id !== 'string' ||
        !['❤️', '🔥', '📚'].includes(String(record.emoji))
      )
        return new Response('Invalid reaction', { status: 400 })
      const { data: target, error } = await admin
        .from(record.target_type === 'session' ? 'sessions' : 'readings')
        .select('user_id')
        .eq('id', record.target_id)
        .maybeSingle()
      if (error) throw error
      if (!target || target.user_id !== actor.partner_id) return Response.json({ sent: false })
      ownerId = target.user_id
      body = `${actor.display_name} ha reaccionado ${record.emoji} a tu lectura`
    }
    const { data: recipient, error } = await admin.from('profiles').select('notify_partner').eq('id', ownerId).single()
    if (error) throw error
    if (!recipient.notify_partner) return Response.json({ sent: false })
    await sendToUser(admin, ownerId, { title: 'Greenbook', body, url: '/nosotros' })
    return Response.json({ sent: true })
  } catch (error) {
    console.error('notify-partner failed', error)
    return Response.json({ error: 'No se pudo enviar el aviso' }, { status: 500 })
  }
})
