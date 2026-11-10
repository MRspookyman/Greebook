/* «avisar»: the app says what just happened and this function tells the partner.
 *
 * It is called with the user's own session (JWT verification stays ON), works out who they are and who
 * their partner is, reads the row on the server and writes the message itself: the app cannot choose the
 * text or the recipient, and a folded slip never travels in a notice.
 *
 * Deploy:  npx supabase functions deploy avisar --project-ref <ref>
 * Secrets: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (see ../_shared/push.ts and DESPLIEGUE.md).
 */
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { sendToUser } from '../_shared/push.ts'
import { candleNotice, finishedNotice, foundNotice, slipNotice, type Push } from '../_shared/mensajes.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

/** At most one «ha encendido su vela» every three hours: a candle's life. */
const CANDLE_QUIET_MS = 3 * 60 * 60 * 1000

async function one<T>(query: PromiseLike<{ data: T | null; error: unknown }>): Promise<T | null> {
  const { data, error } = await query
  if (error) throw error
  return data
}

async function build(admin: SupabaseClient, me: { id: string; name: string }, partnerId: string, what: string, ref: string): Promise<Push | null> {
  if (what === 'vela') {
    const profile = await one(admin.from('profiles').select('candle_lit_at, candle_reading_id, candle_told_at').eq('id', me.id).maybeSingle())
    if (!profile?.candle_lit_at) return null
    if (profile.candle_told_at && Date.now() - new Date(profile.candle_told_at).getTime() < CANDLE_QUIET_MS) return null
    const reading = profile.candle_reading_id
      ? await one(admin.from('readings').select('book_id').eq('id', profile.candle_reading_id).eq('user_id', me.id).maybeSingle())
      : null
    const book = reading ? await one(admin.from('books').select('title').eq('id', reading.book_id).maybeSingle()) : null
    await admin.from('profiles').update({ candle_told_at: new Date().toISOString() }).eq('id', me.id)
    return candleNotice(me.name, book?.title ?? null)
  }

  if (what === 'papel' || what === 'hallazgo') {
    const slip = await one(admin.from('slips').select('id, user_id, book_id, kind, page, body, deleted_at').eq('id', ref).maybeSingle())
    if (!slip || slip.deleted_at) return null
    const book = await one(admin.from('books').select('title').eq('id', slip.book_id).maybeSingle())
    if (!book) return null
    if (what === 'papel') {
      if (slip.user_id !== me.id) return null
      const locked = await one(admin.rpc('slip_locked_for', { p_slip: slip.id, p_viewer: partnerId }))
      return slipNotice({ name: me.name, book: book.title, bookId: slip.book_id, kind: slip.kind, page: slip.page, body: slip.body, locked: locked !== false })
    }
    // «hallazgo»: I opened a slip my partner wrote.
    if (slip.user_id !== partnerId) return null
    return foundNotice(me.name, book.title, slip.book_id, slip.kind === 'carta' || slip.kind === 'prediccion')
  }

  if (what === 'final') {
    const reading = await one(admin.from('readings').select('book_id, status').eq('id', ref).eq('user_id', me.id).maybeSingle())
    if (!reading || reading.status !== 'terminado') return null
    const book = await one(admin.from('books').select('title').eq('id', reading.book_id).maybeSingle())
    if (!book) return null
    const theirs = await one(
      admin.from('readings').select('id').eq('book_id', reading.book_id).eq('user_id', partnerId).eq('status', 'terminado').is('deleted_at', null).limit(1),
    )
    return finishedNotice(me.name, book.title, reading.book_id, !!theirs?.length)
  }
  return null
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (request.method !== 'POST') return reply({ error: 'Método no permitido' }, 405)
  try {
    const url = Deno.env.get('SUPABASE_URL')!
    const authorization = request.headers.get('Authorization') ?? ''
    const asUser = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data: auth } = await asUser.auth.getUser()
    if (!auth.user) return reply({ error: 'Sin sesión' }, 401)

    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const me = await one(admin.from('profiles').select('id, name, partner_id').eq('id', auth.user.id).maybeSingle())
    const partner = me?.partner_id
      ? await one(admin.from('profiles').select('id, partner_id').eq('id', me.partner_id).maybeSingle())
      : null
    // Only a mutual pairing counts, exactly as in the database policies.
    if (!me || !partner || partner.partner_id !== me.id) return reply({ sent: 0 })

    const { what, ref } = (await request.json()) as { what?: string; ref?: string }
    if (typeof what !== 'string' || typeof ref !== 'string') return reply({ error: 'Petición incompleta' }, 400)
    const push = await build(admin, me, partner.id, what, ref)
    if (!push) return reply({ sent: 0 })
    return reply({ sent: await sendToUser(admin, partner.id, push) })
  } catch (error) {
    console.error('avisar', error)
    return reply({ error: 'No se pudo avisar' }, 500)
  }
})
